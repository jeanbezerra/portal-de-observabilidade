package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpAuthentication;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestParameter;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
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
	private static final Pattern SECRET_REFERENCE = Pattern.compile("env:[A-Za-z_][A-Za-z0-9_]*");
	private static final Set<String> FORBIDDEN_HEADERS = Set.of("content-length", "host", "connection", "upgrade");

	private final ObjectMapper objectMapper;

	public HttpRequestConfigurationValidator(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public void validate(HttpRequestConfiguration configuration) {
		validateHttpUri(configuration.url(), "URL da requisição");
		validateParameters(configuration.queryParameters(), false, "parâmetro de query");
		validateParameters(configuration.headers(), true, "cabeçalho");
		validateParameters(configuration.cookies(), false, "cookie");
		validateParameters(configuration.formParameters(), false, "campo de formulário");
		validateAuthentication(configuration.authentication());

		boolean hasAuthorizationHeader = configuration.headers().stream()
				.anyMatch(parameter -> parameter.name().equalsIgnoreCase("Authorization"));
		if (hasAuthorizationHeader && !"NONE".equals(configuration.authentication().type())) {
			throw invalid("Autenticação duplicada",
					"Use o cabeçalho Authorization ou a autenticação estruturada, mas não os dois.");
		}

		if ("JSON".equals(configuration.bodyType()) && !configuration.body().isBlank()) {
			try {
				objectMapper.readTree(configuration.body());
			}
			catch (Exception exception) {
				throw invalid("Corpo JSON inválido", "Informe um documento JSON válido no corpo da requisição.");
			}
		}
		if ("FORM_URLENCODED".equals(configuration.bodyType()) && configuration.formParameters().isEmpty()) {
			throw invalid("Formulário vazio", "Inclua ao menos um campo para o corpo form-urlencoded.");
		}
		if ("NONE".equals(configuration.bodyType()) && !configuration.body().isBlank()) {
			throw invalid("Corpo incompatível", "Remova o corpo ou selecione um tipo de conteúdo.");
		}
	}

	private void validateAuthentication(HttpAuthentication authentication) {
		switch (authentication.type()) {
			case "NONE" -> {
			}
			case "BASIC" -> {
				requireText(authentication.username(), "Usuário obrigatório", "Informe o usuário da autenticação Basic.");
				validateSecretReference(authentication.passwordSecretRef(), "senha da autenticação Basic");
			}
			case "BEARER" -> validateSecretReference(authentication.tokenSecretRef(), "token Bearer");
			case "API_KEY" -> {
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
			case "OAUTH2_CLIENT_CREDENTIALS" -> {
				validateHttpUri(authentication.tokenUrl(), "URL do token OAuth 2.0");
				requireText(authentication.clientId(), "Client ID obrigatório", "Informe o client ID OAuth 2.0.");
				validateSecretReference(authentication.clientSecretRef(), "client secret OAuth 2.0");
				validateParameters(authentication.tokenParameters(), false, "parâmetro do token OAuth 2.0");
			}
			default -> throw invalid("Autenticação inválida", "Selecione um tipo de autenticação suportado.");
		}
	}

	private static void validateParameters(List<HttpRequestParameter> parameters, boolean headers, String label) {
		Set<String> uniqueNames = new HashSet<>();
		for (HttpRequestParameter parameter : parameters) {
			String normalizedName = parameter.name().trim().toLowerCase(Locale.ROOT);
			if (headers && !HEADER_NAME.matcher(parameter.name()).matches()) {
				throw invalid("Cabeçalho inválido", "O nome " + parameter.name() + " não é um cabeçalho HTTP válido.");
			}
			if (label.contains("cookie") && !HEADER_NAME.matcher(parameter.name()).matches()) {
				throw invalid("Cookie inválido", "O nome " + parameter.name() + " não é um cookie válido.");
			}
			if (headers && FORBIDDEN_HEADERS.contains(normalizedName)) {
				throw invalid("Cabeçalho não permitido", "O cabeçalho " + parameter.name() + " é controlado pelo cliente HTTP.");
			}
			if (!headers && !uniqueNames.add(normalizedName) && label.contains("cookie")) {
				throw invalid("Cookie duplicado", "Cada cookie deve possuir um nome único.");
			}
			boolean literal = parameter.value() != null;
			boolean secret = parameter.secretRef() != null && !parameter.secretRef().isBlank();
			if (literal == secret) {
				throw invalid("Valor de " + label + " inválido",
						"Informe exatamente um valor literal ou uma referência de segredo para " + parameter.name() + ".");
			}
			if (secret) validateSecretReference(parameter.secretRef(), label + " " + parameter.name());
		}
	}

	private static void validateHttpUri(String value, String label) {
		try {
			URI uri = URI.create(value);
			if (!("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
					|| uri.getHost() == null) {
				throw new IllegalArgumentException();
			}
		}
		catch (IllegalArgumentException exception) {
			throw invalid(label + " inválida", "Informe uma URL absoluta usando http ou https.");
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
