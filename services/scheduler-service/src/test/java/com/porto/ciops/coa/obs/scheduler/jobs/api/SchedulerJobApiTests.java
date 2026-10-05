package com.porto.ciops.coa.obs.scheduler.jobs.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SchedulerJobApiTests {
	private static HttpServer targetServer;
	private static final AtomicReference<String> RECEIVED_REQUEST = new AtomicReference<>();
	private static volatile CountDownLatch requestReceived;

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbc;

	@BeforeAll
	static void startTargetServer() throws Exception {
		targetServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		targetServer.createContext("/jobs", exchange -> {
			String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
			RECEIVED_REQUEST.set(exchange.getRequestMethod() + " " + exchange.getRequestURI() + " "
					+ exchange.getRequestHeaders().getFirst("X-Origin") + " " + body);
			byte[] response = "{\"accepted\":true}".getBytes(StandardCharsets.UTF_8);
			exchange.getResponseHeaders().add("Content-Type", "application/json");
			exchange.sendResponseHeaders(202, response.length);
			exchange.getResponseBody().write(response);
			exchange.close();
			requestReceived.countDown();
		});
		targetServer.createContext("/failure", exchange -> {
			exchange.sendResponseHeaders(500, -1);
			exchange.close();
			requestReceived.countDown();
		});
		targetServer.start();
	}

	@AfterAll
	static void stopTargetServer() {
		if (targetServer != null) targetServer.stop(0);
	}

	@Test
	void shouldTranslateApplicationProblemToHttpProblemDetail() throws Exception {
		String request = """
				{
				  "name": "rotina-sem-trigger",
				  "group": "plataforma",
				  "description": "Rotina inválida para testar a fronteira HTTP.",
				  "type": "HTTP_REQUEST",
				  "httpRequest": %s,
				  "durable": false,
				  "requestsRecovery": false,
				  "triggers": []
				}
				""".formatted(httpConfiguration("http://127.0.0.1:" + targetServer.getAddress().getPort() + "/jobs"));

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title", is("Rotina não durável sem trigger")));
	}

	@Test
	void shouldManageQuartzJobThroughApi() throws Exception {
		requestReceived = new CountDownLatch(1);
		RECEIVED_REQUEST.set(null);
		String request = """
				{
				  "name": "rotina-integration-test",
				  "group": "plataforma",
				  "description": "Rotina criada pelo teste de integração.",
				  "type": "HTTP_REQUEST",
				  "httpRequest": %s,
				  "durable": true,
				  "requestsRecovery": false,
				  "triggers": [{
				    "key": "rotina-integration-test-trigger",
				    "group": "plataforma",
				    "type": "CronTrigger",
				    "expression": "0 0 8 ? * MON-FRI",
				    "timeZone": "America/Sao_Paulo",
				    "calendar": "feriados-nacionais-br",
				    "priority": 5,
				    "misfireInstruction": "SMART_POLICY"
				  }]
				}
				""".formatted(httpConfiguration("http://127.0.0.1:" + targetServer.getAddress().getPort() + "/jobs"));

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id", is("plataforma.rotina-integration-test")))
				.andExpect(jsonPath("$.type", is("HTTP_REQUEST")))
				.andExpect(jsonPath("$.httpRequest.method", is("POST")))
				.andExpect(jsonPath("$.httpRequest.headers[0].name", is("X-Origin")))
				.andExpect(jsonPath("$.httpRequest.ignoreTlsValidation", is(false)))
				.andExpect(jsonPath("$.executionCounts.successCount", is(0)))
				.andExpect(jsonPath("$.executionCounts.failureCount", is(0)))
				.andExpect(jsonPath("$.triggers[0].type", is("CronTrigger")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/pause"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.triggers[0].state", is("PAUSED")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/resume"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.triggers[0].state", is("NORMAL")));

		String updatedConfiguration = httpConfiguration(
				"http://127.0.0.1:" + targetServer.getAddress().getPort() + "/jobs")
				.replace("\"method\": \"POST\"", "\"method\": \"PUT\"")
				.replace("\"value\":\"integration\"", "\"value\":\"edited\"")
				.replace("\"value\":\"portal\"", "\"value\":\"editor\"")
				.replace("\\\"message\\\":\\\"teste\\\"", "\\\"message\\\":\\\"atualizado\\\"");
		mockMvc.perform(put("/api/v1/jobs/plataforma/rotina-integration-test/configuration")
					.contentType(MediaType.APPLICATION_JSON)
					.content("""
							{
							  "type": "HTTP_REQUEST",
							  "httpRequest": %s
							}
							""".formatted(updatedConfiguration)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.httpRequest.method", is("PUT")))
				.andExpect(jsonPath("$.httpRequest.queryParameters[0].value", is("edited")))
				.andExpect(jsonPath("$.httpRequest.headers[0].value", is("editor")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/trigger"))
				.andExpect(status().isOk());
		org.assertj.core.api.Assertions.assertThat(requestReceived.await(5, TimeUnit.SECONDS))
				.as("a API HTTP de teste deve receber a execução do job")
				.isTrue();
		org.assertj.core.api.Assertions.assertThat(RECEIVED_REQUEST.get())
				.contains("PUT /jobs?origem=edited editor", "\"message\":\"atualizado\"");
		waitForExecutionResult("plataforma", "rotina-integration-test", "SUCCESS", 1);

		mockMvc.perform(get("/api/v1/jobs/plataforma/rotina-integration-test"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.durable", is(true)))
				.andExpect(jsonPath("$.executionCounts.successCount", is(1)))
				.andExpect(jsonPath("$.executionCounts.failureCount", is(0)));
		mockMvc.perform(get("/api/v1/jobs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath(
						"$[?(@.id == 'plataforma.rotina-integration-test')].executionCounts.successCount")
						.value(1));

		String executionLogs = mockMvc.perform(
				get("/api/v1/jobs/plataforma/rotina-integration-test/logs").param("limit", "100"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].fireInstanceId").isNotEmpty())
				.andExpect(jsonPath("$[0].level").isNotEmpty())
				.andReturn().getResponse().getContentAsString();
		org.assertj.core.api.Assertions.assertThat(executionLogs)
				.contains("\"source\":\"http-executor\"")
				.doesNotContain("atualizado", "editor");
		String fireInstanceId = jdbc.queryForObject("""
				SELECT fire_instance_id
				FROM public.scheduler_execution_history
				WHERE job_group = ? AND job_name = ?
				ORDER BY actual_fire_time DESC, id DESC
				LIMIT 1
				""", String.class, "plataforma", "rotina-integration-test");
		for (int index = 0; index < 12; index++) {
			jdbc.update("""
					INSERT INTO public.scheduler_execution_log (
					    fire_instance_id, logged_at, level, log_source, message, details
					) VALUES (?, ?, 'INFO', 'pagination-test', ?, NULL)
					""", fireInstanceId, Instant.parse("2030-01-01T00:00:00Z").plusSeconds(index),
					"pagination-marker-%02d".formatted(index));
		}

		mockMvc.perform(get("/api/v1/jobs/plataforma/rotina-integration-test/logs/search")
					.param("page", "0")
					.param("pageSize", "10")
					.param("sort", "loggedAt")
					.param("direction", "asc")
					.param("query", "pagination-marker"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page", is(0)))
				.andExpect(jsonPath("$.pageSize", is(10)))
				.andExpect(jsonPath("$.totalItems", is(12)))
				.andExpect(jsonPath("$.totalPages", is(2)))
				.andExpect(jsonPath("$.items.length()", is(10)))
				.andExpect(jsonPath("$.items[0].message", is("pagination-marker-00")))
				.andExpect(jsonPath("$.items[9].message", is("pagination-marker-09")))
				.andExpect(jsonPath("$.infoCount", is(12)))
				.andExpect(jsonPath("$.warningCount", is(0)))
				.andExpect(jsonPath("$.errorCount", is(0)))
				.andExpect(jsonPath("$.executions[0].fireInstanceId").isNotEmpty());

		mockMvc.perform(get("/api/v1/jobs/plataforma/rotina-integration-test/logs/search")
					.param("page", "1")
					.param("pageSize", "10")
					.param("sort", "loggedAt")
					.param("direction", "asc")
					.param("query", "pagination-marker"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.page", is(1)))
				.andExpect(jsonPath("$.items.length()", is(2)))
				.andExpect(jsonPath("$.items[0].message", is("pagination-marker-10")))
				.andExpect(jsonPath("$.items[1].message", is("pagination-marker-11")));

		mockMvc.perform(delete("/api/v1/jobs/plataforma/rotina-integration-test"))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/executions"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.jobName == 'rotina-integration-test')].result")
						.value("SUCCESS"));
	}

	@Test
	void shouldRejectAuthenticationSecretsStoredAsPlainText() throws Exception {
		String configuration = httpConfiguration("https://api.example.test/jobs")
				.replace("\"type\": \"NONE\"", "\"type\": \"BEARER\"")
				.replace("\"tokenSecretRef\": \"\"", "\"tokenSecretRef\": \"token-em-texto-puro\"");
		String request = """
				{
				  "name": "rotina-com-token-invalido",
				  "group": "plataforma",
				  "description": "Valida que tokens não sejam persistidos diretamente.",
				  "type": "HTTP_REQUEST",
				  "httpRequest": %s,
				  "durable": true,
				  "requestsRecovery": false,
				  "triggers": []
				}
				""".formatted(configuration);

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title", is("Referência de segredo inválida")));
	}

	@Test
	void shouldPersistErrorLogsForFailedExecution() throws Exception {
		requestReceived = new CountDownLatch(1);
		String request = """
				{
				  "name": "rotina-failure-log-test",
				  "group": "plataforma",
				  "description": "Rotina criada para validar logs de erro.",
				  "type": "HTTP_REQUEST",
				  "httpRequest": %s,
				  "durable": true,
				  "requestsRecovery": false,
				  "triggers": []
				}
				""".formatted(httpConfiguration(
				"http://127.0.0.1:" + targetServer.getAddress().getPort() + "/failure"));

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isCreated());

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-failure-log-test/trigger"))
				.andExpect(status().isOk());
		org.assertj.core.api.Assertions.assertThat(requestReceived.await(5, TimeUnit.SECONDS))
				.as("a API HTTP de teste deve receber a execução que deveria falhar")
				.isTrue();

		String executionLogs = waitForExecutionLog(
				"plataforma", "rotina-failure-log-test", "\"level\":\"ERROR\"");
		org.assertj.core.api.Assertions.assertThat(executionLogs)
				.contains("\"source\":\"http-executor\"")
				.contains("status HTTP 500")
				.doesNotContain("\"message\":\"teste\"");
		waitForExecutionResult("plataforma", "rotina-failure-log-test", "FAILED", 1);
		mockMvc.perform(get("/api/v1/jobs/plataforma/rotina-failure-log-test"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.executionCounts.successCount", is(0)))
				.andExpect(jsonPath("$.executionCounts.failureCount", is(1)));

		mockMvc.perform(delete("/api/v1/jobs/plataforma/rotina-failure-log-test"))
				.andExpect(status().isNoContent());
	}

	@Test
	void shouldRejectInvalidExecutionLogOrdering() throws Exception {
		mockMvc.perform(get("/api/v1/jobs/plataforma/qualquer-rotina/logs/search")
					.param("sort", "invalid"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title", is("Ordenação de logs inválida")));
	}

	@Test
	void shouldPersistExplicitInsecureTlsConfiguration() throws Exception {
		String configuration = httpConfiguration("https://internal.example.test/jobs")
				.replace("\"redirectPolicy\": \"NEVER\"",
						"\"ignoreTlsValidation\": true,\n  \"redirectPolicy\": \"NEVER\"");
		String request = """
				{
				  "name": "rotina-tls-inseguro",
				  "group": "plataforma",
				  "description": "Valida a configuração explícita de TLS inseguro.",
				  "type": "HTTP_REQUEST",
				  "httpRequest": %s,
				  "durable": true,
				  "requestsRecovery": false,
				  "triggers": []
				}
				""".formatted(configuration);

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.httpRequest.ignoreTlsValidation", is(true)));

		mockMvc.perform(delete("/api/v1/jobs/plataforma/rotina-tls-inseguro"))
				.andExpect(status().isNoContent());
	}

	private static String httpConfiguration(String url) {
		return """
				{
				  "method": "POST",
				  "url": "%s",
				  "queryParameters": [{"name":"origem","value":"integration","secretRef":null}],
				  "headers": [{"name":"X-Origin","value":"portal","secretRef":null}],
				  "cookies": [],
				  "authentication": {
				    "type": "NONE",
				    "username": "",
				    "passwordSecretRef": "",
				    "tokenSecretRef": "",
				    "apiKeyName": "",
				    "apiKeyLocation": "HEADER",
				    "tokenUrl": "",
				    "clientId": "",
				    "clientSecretRef": "",
				    "scopes": [],
				    "audience": "",
				    "clientAuthenticationMethod": "BASIC",
				    "tokenParameters": []
				  },
				  "bodyType": "JSON",
				  "body": "{\\\"message\\\":\\\"teste\\\"}",
				  "formParameters": [],
				  "contentType": "application/json",
				  "connectTimeoutSeconds": 5,
				  "requestTimeoutSeconds": 10,
				  "redirectPolicy": "NEVER",
				  "httpVersion": "HTTP_1_1",
				  "expectedStatusCodes": [202],
				  "maxResponseBytes": 65536,
				  "retry": {
				    "maxAttempts": 2,
				    "initialDelayMillis": 10,
				    "backoffMultiplier": 2.0,
				    "statusCodes": [429, 500, 502, 503, 504]
				  }
				}
				""".formatted(url);
	}

	private String waitForExecutionLog(String group, String name, String expected) throws Exception {
		long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
		do {
			String content = mockMvc.perform(get("/api/v1/jobs/{group}/{name}/logs", group, name))
					.andExpect(status().isOk())
					.andReturn().getResponse().getContentAsString();
			if (content.contains(expected)) return content;
			Thread.sleep(25);
		}
		while (System.nanoTime() < deadline);
		throw new AssertionError("O log esperado não foi persistido dentro do prazo: " + expected);
	}

	private void waitForExecutionResult(
			String group, String name, String result, int expectedCount) throws InterruptedException {
		long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
		do {
			Integer count = jdbc.queryForObject("""
					SELECT count(*)
					FROM public.scheduler_execution_history
					WHERE job_group = ? AND job_name = ? AND result = ?
					""", Integer.class, group, name, result);
			if (count != null && count >= expectedCount) return;
			Thread.sleep(25);
		}
		while (System.nanoTime() < deadline);
		throw new AssertionError("O resultado esperado não foi persistido dentro do prazo: " + result);
	}
}
