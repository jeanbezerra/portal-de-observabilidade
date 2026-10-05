package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.net.URI;
import java.util.List;
import java.util.Map;

import javax.naming.InvalidNameException;
import javax.naming.ldap.LdapName;

final class LdapProviderConfigurationValidator {

	private static final String LDAP_URL_REQUIREMENT =
			"configuration.url must be an absolute ldap:// or ldaps:// URI without credentials";
	private final boolean productionMode;

	LdapProviderConfigurationValidator(boolean productionMode) {
		this.productionMode = productionMode;
	}

	void validate(Map<String, String> configuration, List<String> violations) {
		validateUrl(configuration, violations);
		validateRequiredValues(configuration, violations);
		validateName(configuration, "base-dn", violations);
		validateName(configuration, "bind-dn", violations);
		validateName(configuration, "user-search-base", violations);
		validateName(configuration, "group-search-base", violations);
		validateSearchFilter(configuration, "user-search-filter", false, violations);
		validateSearchFilter(configuration, "group-search-filter", true, violations);
		ProviderConfigurationValidation.validateTimeout(configuration, "connection-timeout-ms", violations);
		ProviderConfigurationValidation.validateTimeout(configuration, "read-timeout-ms", violations);
		ProviderConfigurationValidation.validateBoolean(configuration, "user-search-subtree", violations);
	}

	private void validateUrl(Map<String, String> configuration, List<String> violations) {
		String url = configuration.get("url");
		if (url == null || url.isBlank()) {
			violations.add("configuration.url is required");
			return;
		}
		try {
			validateParsedUri(configuration, URI.create(url), violations);
		}
		catch (IllegalArgumentException _) {
			violations.add(LDAP_URL_REQUIREMENT);
		}
	}

	private void validateParsedUri(Map<String, String> configuration, URI ldapUri,
			List<String> violations) {
		boolean ldapScheme = "ldap".equalsIgnoreCase(ldapUri.getScheme());
		boolean ldapsScheme = "ldaps".equalsIgnoreCase(ldapUri.getScheme());
		if (!hasValidLocation(ldapUri, ldapScheme, ldapsScheme)) {
			violations.add(LDAP_URL_REQUIREMENT);
			return;
		}
		if (productionMode && !ldapsScheme) {
			violations.add("configuration.url must use ldaps:// in production mode");
		}
		if (configuration.get("trust-certificate-reference") != null && !ldapsScheme) {
			violations.add("configuration.trust-certificate-reference requires an ldaps:// URL");
		}
	}

	private static boolean hasValidLocation(URI ldapUri, boolean ldapScheme, boolean ldapsScheme) {
		if (!ldapScheme && !ldapsScheme) {
			return false;
		}
		return ldapUri.getHost() != null && ldapUri.getUserInfo() == null
				&& ldapUri.getQuery() == null && ldapUri.getFragment() == null;
	}

	private static void validateRequiredValues(Map<String, String> configuration, List<String> violations) {
		for (String key : List.of("base-dn", "user-search-base", "user-search-filter",
				"group-search-base", "group-search-filter", "bind-dn", "bind-credential-reference")) {
			ProviderConfigurationValidation.requireValue(configuration, key, "configuration." + key, violations);
		}
	}

	private static void validateSearchFilter(Map<String, String> configuration, String key,
			boolean allowUsernamePlaceholder, List<String> violations) {
		String filter = configuration.get(key);
		if (filter == null || filter.contains("{0}")
				|| (allowUsernamePlaceholder && filter.contains("{1}"))) {
			return;
		}
		violations.add("configuration.%s must contain a parameter placeholder".formatted(key));
	}

	private static void validateName(Map<String, String> configuration, String key, List<String> violations) {
		String value = configuration.get(key);
		if (value == null) {
			return;
		}
		try {
			new LdapName(value);
		}
		catch (InvalidNameException _) {
			violations.add("configuration.%s must be a valid LDAP distinguished name".formatted(key));
		}
	}
}
