package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.net.URI;
import java.util.List;
import java.util.Map;

final class ProviderConfigurationValidation {

	public static final String HTTPS_SCHEME = "https";
	private static final int MINIMUM_TIMEOUT_MILLIS = 100;
	private static final int MAXIMUM_TIMEOUT_MILLIS = 60_000;

	private ProviderConfigurationValidation() {
	}

	static void validateTimeout(Map<String, String> configuration, String key, List<String> violations) {
		validateIntegerRange(configuration, key, MINIMUM_TIMEOUT_MILLIS, MAXIMUM_TIMEOUT_MILLIS, violations);
	}

	static void validateIntegerRange(Map<String, String> configuration, String key, int minimum,
			int maximum, List<String> violations) {
		String value = configuration.get(key);
		if (value == null) {
			return;
		}
		try {
			int number = Integer.parseInt(value);
			if (number < minimum || number > maximum) {
				violations.add("configuration.%s must be between %d and %d".formatted(key, minimum, maximum));
			}
		}
		catch (NumberFormatException _) {
			violations.add("configuration.%s must be an integer".formatted(key));
		}
	}

	static void validateBoolean(Map<String, String> configuration, String key, List<String> violations) {
		String value = configuration.get(key);
		if (value != null && !"true".equalsIgnoreCase(value) && !"false".equalsIgnoreCase(value)) {
			violations.add("configuration.%s must be true or false".formatted(key));
		}
	}

	static void requireHttpsUri(Map<String, String> values, String key, List<String> violations) {
		String value = values.get(key);
		try {
			URI uri = URI.create(value == null ? "" : value);
			if (!isAbsoluteHttpsEndpoint(uri)) {
				violations.add("configuration.%s must be an absolute HTTPS URI".formatted(key));
			}
		}
		catch (IllegalArgumentException _) {
			violations.add("configuration.%s must be an absolute HTTPS URI".formatted(key));
		}
	}

	static boolean isAbsoluteHttpsEndpoint(URI uri) {
		return HTTPS_SCHEME.equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
				&& uri.getUserInfo() == null && uri.getFragment() == null;
	}

	static void requireValue(Map<String, String> values, String key, String field,
			List<String> violations) {
		String value = values.get(key);
		if (value == null || value.isBlank()) {
			violations.add(field + " is required");
		}
	}
}
