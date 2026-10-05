package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpAuthentication;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestParameter;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class HttpRequestConfigurationValidator {

	private static final Pattern HEADER_NAME = Pattern.compile("[!#$%&'*+.^_`|~0-9A-Za-z-]+");
	private static final Pattern SECRET_REFERENCE = Pattern.compile("env:[A-Za-z_]\\w*");
	private static final Set<String> FORBIDDEN_HEADERS = Set.of("content-length", "host", "connection", "upgrade");
	private static final int MIN_HTTP_STATUS = 100;
	private static final int MAX_HTTP_STATUS = 599;
	private static final int MAX_OAUTH_SCOPE_LENGTH = 300;
	private static final String COOKIE_LABEL = "cookie";

	private final ObjectMapper objectMapper;

	public HttpRequestConfigurationValidator(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public void validate(@Valid HttpRequestConfiguration configuration) {
		validateHttpUri(configuration.url(), "URL da requisição");
		validateParameters(configuration.queryParameters(), false, "parâmetro de query");
		validateParameters(configuration.headers(), true, "cabeçalho");
		validateParameters(configuration.cookies(), false, COOKIE_LABEL);
		validateParameters(configuration.formParameters(), false, "campo de formulário");
		validateAuthentication(configuration.authentication());
		validateStatusCodes(configuration.expectedStatusCodes(), "status HTTP esperado");
		validateStatusCodes(configuration.retry().statusCodes(), "status HTTP de retentativa");
		validateAuthorization(configuration);
		validateBody(configuration);
	}

	private static void validateAuthorization(HttpRequestConfiguration configuration) {
		boolean hasAuthorizationHeader = configuration.headers().stream()
				.anyMatch(parameter -> "Authorization".equalsIgnoreCase(parameter.name()));
		if (hasAuthorizationHeader && !"NONE".equals(configuration.authentication().type())) {
			throw invalid("Autenticação duplicada",
					"Use o cabeçalho Authorization ou a autenticação estruturada, mas não os dois.");
		}
	}

	private void validateBody(HttpRequestConfiguration configuration) {
		validateJsonBody(configuration);
		validateFormBody(configuration);
		validateEmptyBody(configuration);
	}

	private void validateJsonBody(HttpRequestConfiguration configuration) {
		if ("JSON".equals(configuration.bodyType()) && !configuration.body().isBlank()) {
			try {
				objectMapper.readTree(configuration.body());
			}
			catch (Exception exception) {
				throw ApplicationProblemException.invalidInput(
						"Corpo JSON inválido", "Informe um documento JSON válido no corpo da requisição.", exception);
			}
		}
	}

	private static void validateFormBody(HttpRequestConfiguration configuration) {
		if ("FORM_URLENCODED".equals(configuration.bodyType()) && configuration.formParameters().isEmpty()) {
			throw invalid("Formulário vazio", "Inclua ao menos um campo para o corpo form-urlencoded.");
		}
	}

	private static void validateEmptyBody(HttpRequestConfiguration configuration) {
		if ("NONE".equals(configuration.bodyType()) && !configuration.body().isBlank()) {
			throw invalid("Corpo incompatível", "Remova o corpo ou selecione um tipo de conteúdo.");
		}
	}

	private static void validateAuthentication(HttpAuthentication authentication) {
		switch (authentication.type()) {
			case "NONE" -> {
				// No authentication metadata is required for this explicit mode.
			}
			case "BASIC" -> validateBasicAuthentication(authentication);
			case "BEARER" -> validateSecretReference(authentication.tokenSecretRef(), "token Bearer");
			case "API_KEY" -> validateApiKeyAuthentication(authentication);
			case "OAUTH2_CLIENT_CREDENTIALS" -> validateOAuthAuthentication(authentication);
			default -> throw invalid("Autenticação inválida", "Selecione um tipo de autenticação suportado.");
		}
	}

	private static void validateBasicAuthentication(HttpAuthentication authentication) {
		requireText(authentication.username(), "Usuário obrigatório", "Informe o usuário da autenticação Basic.");
		validateSecretReference(authentication.passwordSecretRef(), "senha da autenticação Basic");
	}

	private static void validateApiKeyAuthentication(HttpAuthentication authentication) {
		requireText(authentication.apiKeyName(), "Nome da API key obrigatório",
				"Informe o nome do cabeçalho ou parâmetro que receberá a API key.");
		requireText(authentication.apiKeyLocation(), "Local da API key obrigatório",
				"Informe se a API key será enviada em HEADER ou QUERY.");
		validateSecretReference(authentication.tokenSecretRef(), "API key");
		if ("HEADER".equals(authentication.apiKeyLocation())
				&& (!HEADER_NAME.matcher(authentication.apiKeyName()).matches()
				|| FORBIDDEN_HEADERS.contains(authentication.apiKeyName().toLowerCase(Locale.ROOT)))) {
			throw invalid("Nome da API key inválido", "Informe um nome de cabeçalho HTTP permitido.");
		}
	}

	private static void validateOAuthAuthentication(HttpAuthentication authentication) {
		validateHttpUri(authentication.tokenUrl(), "URL do token OAuth 2.0");
		requireText(authentication.clientId(), "Client ID obrigatório", "Informe o client ID OAuth 2.0.");
		validateSecretReference(authentication.clientSecretRef(), "client secret OAuth 2.0");
		validateParameters(authentication.tokenParameters(), false, "parâmetro do token OAuth 2.0");
		if (!Set.of("BASIC", "REQUEST_BODY").contains(authentication.clientAuthenticationMethod())) {
			throw invalid("Método OAuth 2.0 inválido", "Use BASIC ou REQUEST_BODY para autenticar o cliente.");
		}
		for (String scope : authentication.scopes()) {
			if (scope == null || scope.isBlank() || scope.length() > MAX_OAUTH_SCOPE_LENGTH) {
				throw invalid("Escopo OAuth 2.0 inválido",
						"Cada escopo deve possuir entre 1 e 300 caracteres.");
			}
		}
	}

	private static void validateParameters(List<HttpRequestParameter> parameters, boolean headers, String label) {
		Set<String> uniqueNames = HashSet.newHashSet(parameters.size());
		boolean cookies = COOKIE_LABEL.equals(label);
		for (HttpRequestParameter parameter : parameters) {
			String normalizedName = parameter.name().trim().toLowerCase(Locale.ROOT);
			validateParameterName(parameter, normalizedName, headers, cookies);
			validateDuplicateCookie(uniqueNames, normalizedName, headers, cookies);
			validateParameterValue(parameter, label);
		}
	}

	private static void validateParameterName(
			HttpRequestParameter parameter, String normalizedName, boolean headers, boolean cookies) {
		if (headers) {
			validateHeaderName(parameter, normalizedName);
			return;
		}
		if (cookies && !HEADER_NAME.matcher(parameter.name()).matches()) {
			throw invalid("Cookie inválido", "O nome " + parameter.name() + " não é um cookie válido.");
		}
	}

	private static void validateHeaderName(HttpRequestParameter parameter, String normalizedName) {
		if (!HEADER_NAME.matcher(parameter.name()).matches()) {
			throw invalid("Cabeçalho inválido", "O nome " + parameter.name() + " não é um cabeçalho HTTP válido.");
		}
		if (FORBIDDEN_HEADERS.contains(normalizedName)) {
			throw invalid("Cabeçalho não permitido", "O cabeçalho " + parameter.name() + " é controlado pelo cliente HTTP.");
		}
	}

	private static void validateDuplicateCookie(
			Set<String> uniqueNames, String normalizedName, boolean headers, boolean cookies) {
		if (!headers && cookies && !uniqueNames.add(normalizedName)) {
			throw invalid("Cookie duplicado", "Cada cookie deve possuir um nome único.");
		}
	}

	private static void validateParameterValue(HttpRequestParameter parameter, String label) {
		boolean literal = parameter.value() != null;
		boolean secret = parameter.secretRef() != null && !parameter.secretRef().isBlank();
		if (literal == secret) {
			throw invalid("Valor de " + label + " inválido",
					"Informe exatamente um valor literal ou uma referência de segredo para " + parameter.name() + ".");
		}
		if (secret) {
			validateSecretReference(parameter.secretRef(), label + " " + parameter.name());
		}
	}

	private static void validateHttpUri(String value, String label) {
		try {
			URI uri = URI.create(value);
			if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
					|| uri.getHost() == null || uri.getUserInfo() != null) {
				throw new IllegalArgumentException();
			}
		}
		catch (IllegalArgumentException exception) {
			throw ApplicationProblemException.invalidInput(
					label + " inválida", "Informe uma URL absoluta usando http ou https.", exception);
		}
	}

	private static void validateStatusCodes(Iterable<Integer> statusCodes, String label) {
		for (Integer statusCode : statusCodes) {
			if (statusCode == null || statusCode < MIN_HTTP_STATUS || statusCode > MAX_HTTP_STATUS) {
				throw invalid("Status HTTP inválido", "Cada " + label + " deve estar entre 100 e 599.");
			}
		}
	}

	private static void validateSecretReference(String value, String label) {
		if (value == null || !SECRET_REFERENCE.matcher(value).matches()) {
			throw invalid("Referência de segredo inválida",
					"Use o formato env:NOME_DA_VARIAVEL para " + label + ".");
		}
	}

	private static void requireText(String value, String title, String detail) {
		if (value == null || value.isBlank()) throw invalid(title, detail);
	}

	private static ApplicationProblemException invalid(String title, String detail) {
		return ApplicationProblemException.invalidInput(title, detail);
	}
}
