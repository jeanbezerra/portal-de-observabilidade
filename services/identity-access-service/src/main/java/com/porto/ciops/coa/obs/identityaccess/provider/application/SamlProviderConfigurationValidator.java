package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.net.URI;
import java.util.List;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;

final class SamlProviderConfigurationValidator {

	private static final int MINIMUM_METADATA_BYTES = 1_024;
	private static final int MAXIMUM_METADATA_BYTES = 5_242_880;
	private static final int MINIMUM_METADATA_CACHE_TTL_MILLIS = 60_000;
	private static final int MAXIMUM_METADATA_CACHE_TTL_MILLIS = 86_400_000;

	private SamlProviderConfigurationValidator() {
	}

	static void validate(IdentityProviderDefinition provider, List<String> violations) {
		Map<String, String> configuration = provider.configuration();
		ProviderConfigurationValidation.requireHttpsUri(configuration, "metadata-uri", violations);
		validateEntityId(configuration, violations);
		validateRegistrationId(provider.id(), configuration, violations);
		validateAssertionConsumerServiceLocation(configuration, violations);
		validateReferencePair(configuration, "signing", violations);
		validateReferencePair(configuration, "decryption", violations);
		ProviderConfigurationValidation.validateBoolean(configuration, "sign-authn-requests", violations);
		if (Boolean.parseBoolean(configuration.get("sign-authn-requests"))
				&& !configuration.containsKey("signing-private-key-reference")) {
			violations.add("configuration.sign-authn-requests requires signing credential references");
		}
		ProviderConfigurationValidation.validateTimeout(configuration, "metadata-connect-timeout-ms", violations);
		ProviderConfigurationValidation.validateTimeout(configuration, "metadata-request-timeout-ms", violations);
		ProviderConfigurationValidation.validateIntegerRange(configuration, "metadata-maximum-bytes",
				MINIMUM_METADATA_BYTES, MAXIMUM_METADATA_BYTES, violations);
		ProviderConfigurationValidation.validateIntegerRange(configuration, "metadata-cache-ttl-ms",
				MINIMUM_METADATA_CACHE_TTL_MILLIS, MAXIMUM_METADATA_CACHE_TTL_MILLIS, violations);
	}

	private static void validateRegistrationId(ProviderId providerId,
			Map<String, String> configuration, List<String> violations) {
		ProviderConfigurationValidation.requireValue(configuration, "registration-id",
				"configuration.registration-id", violations);
		String registrationId = configuration.get("registration-id");
		if (registrationId == null || registrationId.isBlank()) {
			return;
		}
		try {
			if (!new ProviderId(registrationId).equals(providerId)) {
				violations.add("configuration.registration-id must match the provider id");
			}
		}
		catch (IllegalArgumentException _) {
			violations.add("configuration.registration-id must be a valid provider id");
		}
	}

	private static void validateEntityId(Map<String, String> configuration, List<String> violations) {
		String value = configuration.get("entity-id");
		if (value == null || value.isBlank()) {
			violations.add("configuration.entity-id is required");
			return;
		}
		try {
			URI uri = URI.create(value);
			if (!isValidEntityId(uri)) {
				violations.add("configuration.entity-id must be an absolute HTTPS or URN identifier");
			}
		}
		catch (IllegalArgumentException _) {
			violations.add("configuration.entity-id must be an absolute HTTPS or URN identifier");
		}
	}

	private static boolean isValidEntityId(URI uri) {
		if (!uri.isAbsolute() || uri.getUserInfo() != null || uri.getFragment() != null) {
			return false;
		}
		return ProviderConfigurationValidation.HTTPS_SCHEME.equalsIgnoreCase(uri.getScheme())
				|| "urn".equalsIgnoreCase(uri.getScheme());
	}

	private static void validateAssertionConsumerServiceLocation(Map<String, String> configuration,
			List<String> violations) {
		String value = configuration.get("assertion-consumer-service-location");
		if (value == null || isSafeBaseUrlTemplate(value)) {
			return;
		}
		try {
			if (!ProviderConfigurationValidation.isAbsoluteHttpsEndpoint(URI.create(value))) {
				violations.add("configuration.assertion-consumer-service-location must use {baseUrl} or HTTPS");
			}
		}
		catch (IllegalArgumentException _) {
			violations.add("configuration.assertion-consumer-service-location must use {baseUrl} or HTTPS");
		}
	}

	private static boolean isSafeBaseUrlTemplate(String value) {
		return value.startsWith("{baseUrl}/") && !value.contains("..") && !value.contains("?");
	}

	private static void validateReferencePair(Map<String, String> configuration, String purpose,
			List<String> violations) {
		boolean hasPrivateKey = configuration.containsKey(purpose + "-private-key-reference");
		boolean hasCertificate = configuration.containsKey(purpose + "-certificate-reference");
		if (hasPrivateKey != hasCertificate) {
			violations.add("configuration.%s credential requires both private key and certificate references"
					.formatted(purpose));
		}
	}
}
