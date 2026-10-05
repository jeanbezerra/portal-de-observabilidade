package com.porto.ciops.coa.obs.identityaccess.secrets.infrastructure;

import java.net.URI;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolutionException;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;

class EnvironmentSecretResolver implements SecretResolver {

	private static final Pattern ENVIRONMENT_NAME = Pattern.compile("[A-Z][A-Z0-9_]{1,127}");
	private static final Pattern NON_ENVIRONMENT_CHARACTERS = Pattern.compile("[^A-Z0-9]+");
	private static final String ENVIRONMENT_AUTHORITY = "env";
	private final Map<String, String> environment;

	EnvironmentSecretResolver() {
		this(System.getenv());
	}

	EnvironmentSecretResolver(Map<String, String> environment) {
		this.environment = Map.copyOf(environment);
	}

	@Override
	public SecretValue resolve(SecretReference reference) {
		URI uri = URI.create(reference.value());
		String variable = environmentVariable(uri);
		String value = environment.get(variable);
		if (value == null || value.isEmpty()) {
			throw new SecretResolutionException("The referenced secret is not available in this environment");
		}
		return new SecretValue(value.toCharArray());
	}

	private static String environmentVariable(URI uri) {
		String authority = Objects.requireNonNull(uri.getHost(), "secret authority");
		String path = uri.getPath().substring(1);
		if (ENVIRONMENT_AUTHORITY.equalsIgnoreCase(authority)) {
			String exact = path.toUpperCase(Locale.ROOT);
			if (!ENVIRONMENT_NAME.matcher(exact).matches()) {
				throw new SecretResolutionException("The environment secret name is invalid");
			}
			return exact;
		}
		String generated = NON_ENVIRONMENT_CHARACTERS.matcher(
				("OBS_SECRET_" + authority + "_" + path).toUpperCase(Locale.ROOT)).replaceAll("_");
		if (!ENVIRONMENT_NAME.matcher(generated).matches()) {
			throw new SecretResolutionException("The generated environment secret name is invalid");
		}
		return generated;
	}
}
