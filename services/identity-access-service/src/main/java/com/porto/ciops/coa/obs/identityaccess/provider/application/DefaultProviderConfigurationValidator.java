package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import jakarta.validation.Valid;
import org.springframework.stereotype.Component;

@Component
public class DefaultProviderConfigurationValidator implements ProviderConfigurationValidator {

	private static final Set<String> SENSITIVE_TOKENS = Set.of("password", "secret", "private-key", "credential",
			"api-key", "token");
	private final LdapProviderConfigurationValidator ldapValidator;

	public DefaultProviderConfigurationValidator(@Valid IdentityAccessProperties properties) {
		this.ldapValidator = new LdapProviderConfigurationValidator(properties.security().productionMode());
	}

	@Override
	public void validate(IdentityProviderDefinition provider) {
		List<String> violations = new ArrayList<>();
		validateMappings(provider, violations);
		validateSecretReferences(provider.configuration(), violations);

		switch (provider.type()) {
			case SAML -> SamlProviderConfigurationValidator.validate(provider, violations);
			case OIDC -> OidcProviderConfigurationValidator.validate(provider.configuration(), violations);
			case LDAP -> ldapValidator.validate(provider.configuration(), violations);
			default -> throw new IllegalArgumentException("Unsupported identity provider type: " + provider.type());
		}

		throwIfInvalid(violations);
	}

	@Override
	public void validateSecretSafety(IdentityProviderDefinition provider) {
		List<String> violations = new ArrayList<>();
		validateSecretReferences(provider.configuration(), violations);
		throwIfInvalid(violations);
	}

	private static void validateMappings(IdentityProviderDefinition provider, List<String> violations) {
		Map<String, String> mappings = provider.attributeMappings();
		ProviderConfigurationValidation.requireValue(mappings, "subject", "attributeMappings.subject", violations);
		ProviderConfigurationValidation.requireValue(mappings, "username", "attributeMappings.username", violations);
		if (provider.type() == ProviderType.LDAP) {
			ProviderConfigurationValidation.requireValue(mappings, "groups", "attributeMappings.groups", violations);
		}
	}

	private static void validateSecretReferences(Map<String, String> configuration, List<String> violations) {
		configuration.forEach((String key, String value) -> validateSecretReference(key, value, violations));
	}

	private static void validateSecretReference(String key, String value, List<String> violations) {
		String normalizedKey = key.toLowerCase(Locale.ROOT);
		boolean sensitive = SENSITIVE_TOKENS.stream().anyMatch(normalizedKey::contains);
		if (sensitive && !normalizedKey.endsWith("-reference")) {
			violations.add("configuration.%s must be represented by a *-reference key".formatted(key));
		}
		if (normalizedKey.endsWith("-reference") && !isValidSecretReference(value)) {
			violations.add("configuration.%s must contain a valid secret:// reference".formatted(key));
		}
	}

	private static boolean isValidSecretReference(String value) {
		try {
			new SecretReference(value);
			return true;
		}
		catch (RuntimeException _) {
			return false;
		}
	}

	private static void throwIfInvalid(List<String> violations) {
		if (!violations.isEmpty()) {
			throw new InvalidProviderConfigurationException(violations);
		}
	}
}
