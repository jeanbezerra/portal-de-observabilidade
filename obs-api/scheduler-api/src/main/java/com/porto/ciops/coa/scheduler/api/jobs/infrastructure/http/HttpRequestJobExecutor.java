package com.porto.ciops.coa.scheduler.api.jobs.infrastructure.http;

import com.porto.ciops.coa.scheduler.api.jobs.application.model.HttpAuthentication;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.HttpRequestParameter;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.HttpRetryPolicy;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.quartz.JobKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class HttpRequestJobExecutor {

	private static final int OAUTH_RESPONSE_LIMIT = 1_000_000;

	private final JdbcTemplate jdbc;
	private final ObjectMapper objectMapper;
	private final EnvironmentSecretResolver secrets;
	private final List<String> allowedHosts;

	public HttpRequestJobExecutor(JdbcTemplate jdbc, ObjectMapper objectMapper, EnvironmentSecretResolver secrets,
			@Value("${app.http-executor.allowed-hosts:*}") String allowedHosts) {
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
		this.secrets = secrets;
		this.allowedHosts = List.of(allowedHosts.split(",")).stream().map(String::trim)
				.filter(value -> !value.isEmpty()).map(value -> value.toLowerCase(Locale.ROOT)).toList();
	}

	public String execute(JobKey key) throws IOException, InterruptedException {
		HttpRequestConfiguration configuration = loadConfiguration(key);
		HttpClient client = buildClient(configuration);
		List<HttpRequestParameter> queryParameters = new ArrayList<>(configuration.queryParameters());
		String authorization = resolveAuthentication(client, configuration, queryParameters);
		URI uri = withQueryParameters(configuration.url(), queryParameters);
		ensureTargetAllowed(uri);

		HttpRequest request = buildRequest(configuration, uri, authorization);
		HttpRetryPolicy retry = configuration.retry();
		long delayMillis = retry.initialDelayMillis();
		IOException lastIoFailure = null;

		for (int attempt = 1; attempt <= retry.maxAttempts(); attempt++) {
			try {
				HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
				byte[] responseBody = readLimited(response.body(), configuration.maxResponseBytes());
				if (retry.statusCodes().contains(response.statusCode()) && attempt < retry.maxAttempts()) {
					delay(delayMillis);
					delayMillis = nextDelay(delayMillis, retry.backoffMultiplier());
					continue;
				}
				if (!isExpectedStatus(response.statusCode(), configuration.expectedStatusCodes())) {
					throw new UnexpectedHttpStatusException(response.statusCode());
				}
				return "HTTP " + response.statusCode() + " · " + responseBody.length
						+ " bytes recebidos · tentativa " + attempt + " de " + retry.maxAttempts() + ".";
			}
			catch (UnexpectedHttpStatusException exception) {
				throw exception;
			}
			catch (IOException exception) {
				lastIoFailure = exception;
				if (attempt == retry.maxAttempts()) break;
				delay(delayMillis);
				delayMillis = nextDelay(delayMillis, retry.backoffMultiplier());
			}
		}

		throw lastIoFailure == null ? new IOException("A requisição HTTP não foi concluída.") : lastIoFailure;
	}

	private HttpRequestConfiguration loadConfiguration(JobKey key) {
		List<String> rows = jdbc.queryForList("""
				SELECT execution_configuration
				FROM public.scheduler_job_metadata
				WHERE job_group = ? AND job_name = ? AND job_type = 'HTTP_REQUEST'
				""", String.class, key.getGroup(), key.getName());
		if (rows.isEmpty() || rows.getFirst() == null) {
			throw new IllegalStateException("A definição HTTP da rotina não foi encontrada.");
		}
		try {
			return objectMapper.readValue(rows.getFirst(), HttpRequestConfiguration.class);
		}
		catch (Exception exception) {
			throw new IllegalStateException("A definição HTTP armazenada é inválida.", exception);
		}
	}

	private HttpClient buildClient(HttpRequestConfiguration configuration) {
		if ("NORMAL".equals(configuration.redirectPolicy()) && !allowedHosts.contains("*")) {
			throw new IllegalStateException(
					"Redirecionamentos exigem HTTP_EXECUTOR_ALLOWED_HOSTS=* para evitar saída a hosts não autorizados.");
		}
		return HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(configuration.connectTimeoutSeconds()))
				.followRedirects(HttpClient.Redirect.valueOf(configuration.redirectPolicy()))
				.version(HttpClient.Version.valueOf(configuration.httpVersion()))
				.build();
	}

	private HttpRequest buildRequest(HttpRequestConfiguration configuration, URI uri, String authorization) {
		HttpRequest.Builder builder = HttpRequest.newBuilder(uri)
				.timeout(Duration.ofSeconds(configuration.requestTimeoutSeconds()));

		for (HttpRequestParameter header : configuration.headers()) {
			builder.header(header.name(), resolveValue(header));
		}
		HttpAuthentication authentication = configuration.authentication();
		if ("API_KEY".equals(authentication.type()) && "HEADER".equals(authentication.apiKeyLocation())) {
			builder.header(authentication.apiKeyName(), secrets.resolve(authentication.tokenSecretRef()));
		}
		if (!configuration.cookies().isEmpty()) {
			String cookieHeader = configuration.cookies().stream()
					.map(cookie -> cookie.name() + "=" + resolveValue(cookie))
					.collect(Collectors.joining("; "));
			builder.header("Cookie", cookieHeader);
		}
		if (authorization != null) builder.header("Authorization", authorization);

		HttpRequest.BodyPublisher body = switch (configuration.bodyType()) {
			case "RAW", "JSON" -> HttpRequest.BodyPublishers.ofString(configuration.body(), StandardCharsets.UTF_8);
			case "FORM_URLENCODED" -> HttpRequest.BodyPublishers.ofString(
					encodeParameters(configuration.formParameters()), StandardCharsets.UTF_8);
			default -> HttpRequest.BodyPublishers.noBody();
		};
		if (!"NONE".equals(configuration.bodyType()) && !hasHeader(configuration.headers(), "Content-Type")) {
			String contentType = contentType(configuration);
			if (!contentType.isBlank()) builder.header("Content-Type", contentType);
		}
		return builder.method(configuration.method(), body).build();
	}

	private String resolveAuthentication(HttpClient client, HttpRequestConfiguration configuration,
			List<HttpRequestParameter> queryParameters) throws IOException, InterruptedException {
		HttpAuthentication authentication = configuration.authentication();
		return switch (authentication.type()) {
			case "NONE" -> null;
			case "BASIC" -> "Basic " + Base64.getEncoder().encodeToString(
					(authentication.username() + ":" + secrets.resolve(authentication.passwordSecretRef()))
							.getBytes(StandardCharsets.UTF_8));
			case "BEARER" -> "Bearer " + secrets.resolve(authentication.tokenSecretRef());
			case "API_KEY" -> {
				if ("QUERY".equals(authentication.apiKeyLocation())) {
					queryParameters.add(new HttpRequestParameter(authentication.apiKeyName(), null,
							authentication.tokenSecretRef()));
					yield null;
				}
				yield null;
			}
			case "OAUTH2_CLIENT_CREDENTIALS" -> requestOAuthToken(client, configuration, authentication);
			default -> throw new IllegalStateException("Tipo de autenticação HTTP não suportado.");
		};
	}

	private String requestOAuthToken(HttpClient client, HttpRequestConfiguration configuration,
			HttpAuthentication authentication) throws IOException, InterruptedException {
		URI tokenUri = URI.create(authentication.tokenUrl());
		ensureTargetAllowed(tokenUri);
		List<HttpRequestParameter> tokenParameters = new ArrayList<>();
		tokenParameters.add(new HttpRequestParameter("grant_type", "client_credentials", null));
		if (!authentication.scopes().isEmpty()) {
			tokenParameters.add(new HttpRequestParameter("scope", String.join(" ", authentication.scopes()), null));
		}
		if (authentication.audience() != null && !authentication.audience().isBlank()) {
			tokenParameters.add(new HttpRequestParameter("audience", authentication.audience(), null));
		}
		tokenParameters.addAll(authentication.tokenParameters());

		HttpRequest.Builder tokenRequest = HttpRequest.newBuilder(tokenUri)
				.timeout(Duration.ofSeconds(configuration.requestTimeoutSeconds()))
				.header("Accept", "application/json")
				.header("Content-Type", "application/x-www-form-urlencoded");
		if ("REQUEST_BODY".equals(authentication.clientAuthenticationMethod())) {
			tokenParameters.add(new HttpRequestParameter("client_id", authentication.clientId(), null));
			tokenParameters.add(new HttpRequestParameter("client_secret",
					secrets.resolve(authentication.clientSecretRef()), null));
		}
		else {
			String credentials = authentication.clientId() + ":" + secrets.resolve(authentication.clientSecretRef());
			tokenRequest.header("Authorization", "Basic "
					+ Base64.getEncoder().encodeToString(credentials.getBytes(StandardCharsets.UTF_8)));
		}

		HttpResponse<InputStream> response = client.send(tokenRequest.POST(HttpRequest.BodyPublishers.ofString(
				encodeParameters(tokenParameters), StandardCharsets.UTF_8)).build(), HttpResponse.BodyHandlers.ofInputStream());
		byte[] body = readLimited(response.body(), OAUTH_RESPONSE_LIMIT);
		if (response.statusCode() < 200 || response.statusCode() > 299) {
			throw new IOException("O servidor OAuth 2.0 respondeu com status HTTP " + response.statusCode() + ".");
		}
		JsonNode payload = objectMapper.readTree(body);
		String accessToken = payload.path("access_token").stringValue("");
		if (accessToken.isBlank()) throw new IOException("A resposta OAuth 2.0 não contém access_token.");
		String tokenType = payload.path("token_type").stringValue("");
		if (tokenType.isBlank()) tokenType = "Bearer";
		return tokenType + " " + accessToken;
	}

	private URI withQueryParameters(String rawUrl, List<HttpRequestParameter> parameters) {
		if (parameters.isEmpty()) return URI.create(rawUrl);
		int fragmentIndex = rawUrl.indexOf('#');
		String fragment = fragmentIndex >= 0 ? rawUrl.substring(fragmentIndex) : "";
		String base = fragmentIndex >= 0 ? rawUrl.substring(0, fragmentIndex) : rawUrl;
		String separator = base.contains("?") ? (base.endsWith("?") || base.endsWith("&") ? "" : "&") : "?";
		return URI.create(base + separator + encodeParameters(parameters) + fragment);
	}

	private String encodeParameters(List<HttpRequestParameter> parameters) {
		return parameters.stream()
				.map(parameter -> encode(parameter.name()) + "=" + encode(resolveValue(parameter)))
				.collect(Collectors.joining("&"));
	}

	private String resolveValue(HttpRequestParameter parameter) {
		return parameter.secretRef() == null || parameter.secretRef().isBlank()
				? parameter.value() : secrets.resolve(parameter.secretRef());
	}

	private void ensureTargetAllowed(URI uri) {
		String host = uri.getHost().toLowerCase(Locale.ROOT);
		boolean allowed = allowedHosts.stream().anyMatch(pattern -> "*".equals(pattern)
				|| host.equals(pattern) || (pattern.startsWith("*.") && host.endsWith(pattern.substring(1))));
		if (!allowed) throw new IllegalStateException("O host " + host + " não está autorizado para execução HTTP.");
	}

	private static byte[] readLimited(InputStream input, int limit) throws IOException {
		try (input) {
			byte[] bytes = input.readNBytes(limit + 1);
			if (bytes.length > limit) {
				throw new IOException("A resposta excedeu o limite configurado de " + limit + " bytes.");
			}
			return bytes;
		}
	}

	private static String contentType(HttpRequestConfiguration configuration) {
		if (!configuration.contentType().isBlank()) return configuration.contentType();
		return switch (configuration.bodyType()) {
			case "JSON" -> "application/json; charset=UTF-8";
			case "FORM_URLENCODED" -> "application/x-www-form-urlencoded; charset=UTF-8";
			default -> "";
		};
	}

	private static boolean hasHeader(List<HttpRequestParameter> headers, String name) {
		return headers.stream().anyMatch(header -> header.name().equalsIgnoreCase(name));
	}

	private static boolean isExpectedStatus(int status, List<Integer> expectedStatuses) {
		return expectedStatuses.isEmpty() ? status >= 200 && status <= 299 : expectedStatuses.contains(status);
	}

	private static long nextDelay(long currentDelay, double multiplier) {
		return Math.min(60_000L, Math.round(currentDelay * multiplier));
	}

	private static void delay(long delayMillis) throws InterruptedException {
		if (delayMillis > 0) Thread.sleep(delayMillis);
	}

	private static String encode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
	}

	private static final class UnexpectedHttpStatusException extends IOException {

		private UnexpectedHttpStatusException(int statusCode) {
			super("A API respondeu com status HTTP " + statusCode + ".");
		}
	}
}
