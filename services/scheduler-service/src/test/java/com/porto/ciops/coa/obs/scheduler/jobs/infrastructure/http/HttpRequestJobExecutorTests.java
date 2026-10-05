package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.porto.ciops.coa.obs.scheduler.jobs.application.ExecutionLogRecorder;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpAuthentication;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestParameter;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRetryPolicy;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.quartz.JobKey;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.ObjectMapper;

class HttpRequestJobExecutorTests {

	@Test
	void shouldRetryAndApplyRequestConfiguration() throws Exception {
		AtomicInteger attempts = new AtomicInteger();
		AtomicReference<String> receivedRequest = new AtomicReference<>();
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/execute", exchange -> {
			int attempt = attempts.incrementAndGet();
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			receivedRequest.set(exchange.getRequestURI() + " | "
					+ exchange.getRequestHeaders().getFirst("X-Secret") + " | "
					+ exchange.getRequestHeaders().getFirst("Cookie") + " | "
					+ exchange.getRequestHeaders().getFirst("Content-Type") + " | " + body);
			byte[] response = (attempt == 1 ? "retry" : "accepted").getBytes(StandardCharsets.UTF_8);
			exchange.sendResponseHeaders(attempt == 1 ? 503 : 200, response.length);
			exchange.getResponseBody().write(response);
			exchange.close();
		});
		server.start();

		try {
			ObjectMapper objectMapper = new ObjectMapper();
			HttpRequestConfiguration configuration = configuration(server.getAddress().getPort());
			JdbcTemplate jdbc = mockJdbcConfiguration(objectMapper, configuration);
			EnvironmentSecretResolver secrets = mock(EnvironmentSecretResolver.class);
			when(secrets.resolve(anyString())).thenReturn("secret value");
			HttpRequestJobExecutor executor = new HttpRequestJobExecutor(
					jdbc, objectMapper, secrets, mock(ExecutionLogRecorder.class), "127.0.0.1", false);

			String result = executor.execute(JobKey.jobKey("request", "tests"), "fire-1");

			assertThat(result).contains("HTTP 200", "tentativa 2 de 2");
			assertThat(attempts).hasValue(2);
			assertThat(receivedRequest.get())
					.contains("existing=yes", "origin=integration", "api_key=secret%20value")
					.contains("secret value | session=abc | application/x-www-form-urlencoded")
					.endsWith("message=hello%20world");
		}
		finally {
			server.stop(0);
		}
	}

	@Test
	void shouldObtainOAuthTokenUsingRequestBody() throws Exception {
		AtomicReference<String> receivedTokenRequest = new AtomicReference<>();
		AtomicReference<String> receivedAuthorization = new AtomicReference<>();
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/token", exchange -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			receivedTokenRequest.set(body);
			byte[] response = "{\"access_token\":\"oauth-secret\",\"token_type\":\"Custom\"}"
					.getBytes(StandardCharsets.UTF_8);
			exchange.sendResponseHeaders(200, response.length);
			exchange.getResponseBody().write(response);
			exchange.close();
		});
		server.createContext("/oauth-execute", exchange -> {
			receivedAuthorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
			exchange.sendResponseHeaders(204, -1);
			exchange.close();
		});
		server.start();

		try {
			ObjectMapper objectMapper = new ObjectMapper();
			HttpRequestConfiguration configuration = oauthConfiguration(server.getAddress().getPort());
			JdbcTemplate jdbc = mockJdbcConfiguration(objectMapper, configuration);
			EnvironmentSecretResolver secrets = mock(EnvironmentSecretResolver.class);
			when(secrets.resolve(anyString())).thenReturn("secret value");
			HttpRequestJobExecutor executor = new HttpRequestJobExecutor(
					jdbc, objectMapper, secrets, mock(ExecutionLogRecorder.class), "127.0.0.1", false);

			String result = executor.execute(JobKey.jobKey("request", "tests"), "fire-oauth");

			assertThat(result).contains("HTTP 204", "tentativa 1 de 1");
			assertThat(receivedAuthorization).hasValue("Custom oauth-secret");
			assertThat(receivedTokenRequest.get())
					.contains("grant_type=client_credentials", "scope=read%20write", "audience=portal")
					.contains("resource=scheduler", "client_id=client-app", "client_secret=secret%20value");
		}
		finally {
			server.stop(0);
		}
	}

	@Test
	void shouldRejectUnexpectedHttpStatus() throws Exception {
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/execute", exchange -> {
			byte[] response = "failed".getBytes(StandardCharsets.UTF_8);
			exchange.sendResponseHeaders(500, response.length);
			exchange.getResponseBody().write(response);
			exchange.close();
		});
		server.start();

		try {
			ObjectMapper objectMapper = new ObjectMapper();
			JdbcTemplate jdbc = mockJdbcConfiguration(objectMapper, configuration(server.getAddress().getPort()));
			EnvironmentSecretResolver secrets = mock(EnvironmentSecretResolver.class);
			when(secrets.resolve(anyString())).thenReturn("secret value");
			HttpRequestJobExecutor executor = new HttpRequestJobExecutor(
					jdbc, objectMapper, secrets, mock(ExecutionLogRecorder.class), "127.0.0.1", false);

			assertThatThrownBy(() -> executor.execute(JobKey.jobKey("request", "tests"), "fire-error"))
					.isInstanceOf(IOException.class)
					.hasMessageContaining("500");
		}
		finally {
			server.stop(0);
		}
	}

	private static JdbcTemplate mockJdbcConfiguration(
			ObjectMapper objectMapper, HttpRequestConfiguration configuration) throws Exception {
		JdbcTemplate jdbc = mock(JdbcTemplate.class);
		when(jdbc.queryForList("""
				SELECT execution_configuration
				FROM public.scheduler_job_metadata
				WHERE job_group = ? AND job_name = ? AND job_type = 'HTTP_REQUEST'
				""", String.class, "tests", "request"))
				.thenReturn(List.of(objectMapper.writeValueAsString(configuration)));
		return jdbc;
	}

	private static HttpRequestConfiguration configuration(int port) {
		HttpAuthentication authentication = new HttpAuthentication(
				"API_KEY", "", "", "env:API_KEY", "api_key", "QUERY",
				"", "", "", List.of(), "", "BASIC", List.of());
		return new HttpRequestConfiguration(
				"POST",
				"http://127.0.0.1:" + port + "/execute?existing=yes",
				List.of(new HttpRequestParameter("origin", "integration", null)),
				List.of(new HttpRequestParameter("X-Secret", null, "env:HEADER_SECRET")),
				List.of(new HttpRequestParameter("session", "abc", null)),
				authentication,
				"FORM_URLENCODED",
				"",
				List.of(new HttpRequestParameter("message", "hello world", null)),
				"",
				5,
				5,
				false,
				"NEVER",
				"HTTP_1_1",
				List.of(),
				1_024,
				new HttpRetryPolicy(2, 0, 2.0, List.of(503)));
	}

	private static HttpRequestConfiguration oauthConfiguration(int port) {
		HttpAuthentication authentication = new HttpAuthentication(
				"OAUTH2_CLIENT_CREDENTIALS", "", "", "", "", "HEADER",
				"http://127.0.0.1:" + port + "/token", "client-app", "env:CLIENT_SECRET",
				List.of("read", "write"), "portal", "REQUEST_BODY",
				List.of(new HttpRequestParameter("resource", "scheduler", null)));
		return new HttpRequestConfiguration(
				"GET",
				"http://127.0.0.1:" + port + "/oauth-execute",
				List.of(),
				List.of(),
				List.of(),
				authentication,
				"NONE",
				"",
				List.of(),
				"",
				5,
				5,
				false,
				"NEVER",
				"HTTP_1_1",
				List.of(204),
				1_024,
				new HttpRetryPolicy(1, 0, 1.0, List.of()));
	}
}
