package com.porto.ciops.coa.obs.scheduler.jobs.application;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpAuthentication;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestParameter;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRetryPolicy;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class HttpRequestConfigurationValidatorTests {

	private final HttpRequestConfigurationValidator validator =
			new HttpRequestConfigurationValidator(new ObjectMapper());

	@Test
	void shouldAcceptAValidConfiguration() {
		assertThatCode(() -> validator.validate(configuration("https://api.example.test/jobs")))
				.doesNotThrowAnyException();
	}

	@Test
	void shouldRejectCredentialsEmbeddedInTheUrl() {
		assertInvalid(configuration("https://user:password@api.example.test/jobs"),
				"Informe uma URL absoluta usando http ou https");
	}

	@Test
	void shouldRejectInvalidExpectedAndRetryStatusCodes() {
		HttpRequestConfiguration invalidExpected = copyWithStatusCodes(List.of(99), retry(List.of(500)));
		HttpRequestConfiguration invalidRetry = copyWithStatusCodes(List.of(204), retry(List.of(600)));

		assertInvalid(invalidExpected, "Cada status HTTP esperado deve estar entre 100 e 599.");
		assertInvalid(invalidRetry, "Cada status HTTP de retentativa deve estar entre 100 e 599.");
	}

	@Test
	void shouldRejectInvalidJsonAndIncompatibleBodies() {
		assertInvalid(copyWithBody("JSON", "{"), "Informe um documento JSON válido");
		assertInvalid(copyWithBody("NONE", "not-empty"), "Remova o corpo");
		assertInvalid(copyWithBody("FORM_URLENCODED", ""), "Inclua ao menos um campo");
	}

	@Test
	void shouldRejectForbiddenHeadersAndInvalidCookieValues() {
		assertInvalid(copyWithParameters(
				List.of(), List.of(new HttpRequestParameter("Host", "example.test", null)), List.of()),
				"controlado pelo cliente HTTP");
		assertInvalid(copyWithParameters(
				List.of(), List.of(), List.of(new HttpRequestParameter("session", null, null))),
				"Informe exatamente um valor literal");
	}

	@Test
	void shouldRejectDuplicateCookies() {
		assertInvalid(copyWithParameters(List.of(), List.of(), List.of(
				new HttpRequestParameter("session", "first", null),
				new HttpRequestParameter("SESSION", "second", null))), "Cada cookie deve possuir um nome único");
	}

	@Test
	void shouldValidateStructuredAuthentication() {
		assertInvalid(copyWithAuthentication(authentication("BASIC", "", "env:BASIC_PASSWORD")),
				"Informe o usuário da autenticação Basic");
		assertInvalid(copyWithAuthentication(authentication("BEARER", "", "plain-text-token")),
				"Use o formato env:NOME_DA_VARIAVEL");
		assertInvalid(copyWithAuthentication(authentication("API_KEY", "", "env:API_KEY")),
				"Informe o nome do cabeçalho ou parâmetro");
	}

	@Test
	void shouldValidateOAuthClientConfiguration() {
		HttpAuthentication invalidMethod = oauth("INVALID", List.of("read"));
		HttpAuthentication invalidScope = oauth("BASIC", List.of(" "));

		assertInvalid(copyWithAuthentication(invalidMethod), "Use BASIC ou REQUEST_BODY");
		assertInvalid(copyWithAuthentication(invalidScope), "Cada escopo deve possuir entre 1 e 300 caracteres");
	}

	@Test
	void shouldAcceptEverySupportedAuthenticationMode() {
		List<HttpRequestConfiguration> configurations = List.of(
				copyWithAuthentication(authentication("BASIC", "scheduler", "env:BASIC_PASSWORD")),
				copyWithAuthentication(authentication("BEARER", "", "env:BEARER_TOKEN")),
				copyWithAuthentication(apiKey("X-API-Key", "HEADER")),
				copyWithAuthentication(apiKey("api_key", "QUERY")),
				copyWithAuthentication(oauth("REQUEST_BODY", List.of("jobs:read"))));

		for (HttpRequestConfiguration configuration : configurations) {
			assertThatCode(() -> validator.validate(configuration)).doesNotThrowAnyException();
		}
	}

	@Test
	void shouldRejectInvalidAuthenticationMetadata() {
		HttpAuthentication unsupported = authentication("UNKNOWN", "", "");
		HttpAuthentication forbiddenApiKey = apiKey("Host", "HEADER");
		HttpAuthentication oauthWithInvalidParameter = new HttpAuthentication(
				"OAUTH2_CLIENT_CREDENTIALS", "", "", "", "", "HEADER",
				"https://identity.example.test/oauth/token", "scheduler-service", "env:OAUTH_CLIENT_SECRET",
				List.of("jobs:read"), "", "BASIC",
				List.of(new HttpRequestParameter("tenant", null, "literal-secret")));

		assertInvalid(copyWithAuthentication(unsupported), "Selecione um tipo de autenticação suportado");
		assertInvalid(copyWithAuthentication(forbiddenApiKey), "Informe um nome de cabeçalho HTTP permitido");
		assertInvalid(copyWithAuthentication(oauthWithInvalidParameter), "Use o formato env:NOME_DA_VARIAVEL");
	}

	@Test
	void shouldRejectInvalidUrisHeadersCookiesAndDuplicateAuthorization() {
		HttpRequestConfiguration invalidHeader = copyWithParameters(
				List.of(), List.of(new HttpRequestParameter("bad header", "value", null)), List.of());
		HttpRequestConfiguration invalidCookie = copyWithParameters(
				List.of(), List.of(), List.of(new HttpRequestParameter("bad cookie", "value", null)));
		HttpRequestConfiguration duplicateAuthorization = copyWithAuthenticationAndHeaders(
				authentication("BASIC", "scheduler", "env:BASIC_PASSWORD"),
				List.of(new HttpRequestParameter("Authorization", "Basic value", null)));

		assertInvalid(configuration("ftp://api.example.test/jobs"), "Informe uma URL absoluta usando http ou https");
		assertInvalid(invalidHeader, "não é um cabeçalho HTTP válido");
		assertInvalid(invalidCookie, "não é um cookie válido");
		assertInvalid(duplicateAuthorization, "Use o cabeçalho Authorization ou a autenticação estruturada");
	}

	private void assertInvalid(HttpRequestConfiguration configuration, String message) {
		assertThatThrownBy(() -> validator.validate(configuration))
				.isInstanceOf(ApplicationProblemException.class)
				.hasMessageContaining(message);
	}

	private static HttpRequestConfiguration configuration(String url) {
		return new HttpRequestConfiguration(
				"GET", url, List.of(), List.of(), List.of(), authentication("NONE", "", ""),
				"NONE", "", List.of(), "", 5, 10, false, "NEVER", "HTTP_1_1",
				List.of(204), 65_536, retry(List.of(429, 500)));
	}

	private static HttpRequestConfiguration copyWithStatusCodes(
			List<Integer> expectedStatusCodes, HttpRetryPolicy retryPolicy) {
		HttpRequestConfiguration source = configuration("https://api.example.test/jobs");
		return copy(source, source.authentication(), source.bodyType(), source.body(), source.queryParameters(),
				source.headers(), source.cookies(), source.formParameters(), expectedStatusCodes, retryPolicy);
	}

	private static HttpRequestConfiguration copyWithBody(String bodyType, String body) {
		HttpRequestConfiguration source = configuration("https://api.example.test/jobs");
		return copy(source, source.authentication(), bodyType, body, source.queryParameters(),
				source.headers(), source.cookies(), source.formParameters(), source.expectedStatusCodes(), source.retry());
	}

	private static HttpRequestConfiguration copyWithParameters(
			List<HttpRequestParameter> query, List<HttpRequestParameter> headers, List<HttpRequestParameter> cookies) {
		HttpRequestConfiguration source = configuration("https://api.example.test/jobs");
		return copy(source, source.authentication(), source.bodyType(), source.body(), query, headers, cookies,
				source.formParameters(), source.expectedStatusCodes(), source.retry());
	}

	private static HttpRequestConfiguration copyWithAuthentication(HttpAuthentication authentication) {
		HttpRequestConfiguration source = configuration("https://api.example.test/jobs");
		return copy(source, authentication, source.bodyType(), source.body(), source.queryParameters(),
				source.headers(), source.cookies(), source.formParameters(), source.expectedStatusCodes(), source.retry());
	}

	private static HttpRequestConfiguration copyWithAuthenticationAndHeaders(
			HttpAuthentication authentication, List<HttpRequestParameter> headers) {
		HttpRequestConfiguration source = configuration("https://api.example.test/jobs");
		return copy(source, authentication, source.bodyType(), source.body(), source.queryParameters(),
				headers, source.cookies(), source.formParameters(), source.expectedStatusCodes(), source.retry());
	}

	private static HttpRequestConfiguration copy(
			HttpRequestConfiguration source, HttpAuthentication authentication, String bodyType, String body,
			List<HttpRequestParameter> query, List<HttpRequestParameter> headers, List<HttpRequestParameter> cookies,
			List<HttpRequestParameter> form, List<Integer> expected, HttpRetryPolicy retryPolicy) {
		return new HttpRequestConfiguration(
				source.method(), source.url(), query, headers, cookies, authentication, bodyType, body, form,
				source.contentType(), source.connectTimeoutSeconds(), source.requestTimeoutSeconds(),
				source.ignoreTlsValidation(), source.redirectPolicy(), source.httpVersion(), expected,
				source.maxResponseBytes(), retryPolicy);
	}

	private static HttpAuthentication authentication(String type, String username, String secretReference) {
		return new HttpAuthentication(
				type, username, "BASIC".equals(type) ? secretReference : "",
				"BEARER".equals(type) || "API_KEY".equals(type) ? secretReference : "",
				"", "HEADER", "", "", "", List.of(), "", "BASIC", List.of());
	}

	private static HttpAuthentication oauth(String clientAuthenticationMethod, List<String> scopes) {
		return new HttpAuthentication(
				"OAUTH2_CLIENT_CREDENTIALS", "", "", "", "", "HEADER",
				"https://identity.example.test/oauth/token", "scheduler-service", "env:OAUTH_CLIENT_SECRET",
				scopes, "", clientAuthenticationMethod, List.of());
	}

	private static HttpAuthentication apiKey(String name, String location) {
		return new HttpAuthentication(
				"API_KEY", "", "", "env:API_KEY", name, location,
				"", "", "", List.of(), "", "BASIC", List.of());
	}

	private static HttpRetryPolicy retry(List<Integer> statusCodes) {
		return new HttpRetryPolicy(2, 10, 2.0, statusCodes);
	}
}
