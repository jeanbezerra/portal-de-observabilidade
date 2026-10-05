package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.util.List;
import java.util.Map;

final class OidcProviderConfigurationValidator {
	private OidcProviderConfigurationValidator() {
	}

	static void validate(Map<String, String> configuration, List<String> violations) {
		ProviderConfigurationValidation.requireHttpsUri(configuration, "issuer-uri", violations);
		ProviderConfigurationValidation.requireValue(configuration, "client-id", "configuration.client-id",
				violations);
		ProviderConfigurationValidation.requireValue(configuration, "client-secret-reference",
				"configuration.client-secret-reference", violations);
	}
}
