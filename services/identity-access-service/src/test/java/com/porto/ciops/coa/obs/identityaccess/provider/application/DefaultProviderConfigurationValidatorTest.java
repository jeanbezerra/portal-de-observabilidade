package com.porto.ciops.coa.obs.identityaccess.provider.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class DefaultProviderConfigurationValidatorTest {

	private final DefaultProviderConfigurationValidator validator = new DefaultProviderConfigurationValidator(
			new IdentityAccessProperties(
					new IdentityAccessProperties.Session(Duration.ofMinutes(30), Duration.ofHours(8),
							"OBS_SESSION", true, "lax"),
					new IdentityAccessProperties.Token(URI.create("https://identity.example"), "obs-platform",
							Duration.ofMinutes(10), false, ""),
					new IdentityAccessProperties.Security(true, List.of("https://portal.example"))));

	@Test
	void acceptsOidcConfigurationWithSecretReference() {
		IdentityProviderDefinition provider = oidc(Map.of(
				"issuer-uri", "https://login.example/tenant",
				"client-id", "obs-portal",
				"client-secret-reference", "secret://identity/oidc/client-secret"));

		assertThatCode(() -> validator.validate(provider)).doesNotThrowAnyException();
	}

	@Test
	void rejectsInlineSecrets() {
		IdentityProviderDefinition provider = oidc(Map.of(
				"issuer-uri", "https://login.example/tenant",
				"client-id", "obs-portal",
				"client-secret", "must-not-be-here"));

		assertThatThrownBy(() -> validator.validateSecretSafety(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> org.assertj.core.api.Assertions.assertThat(
						((InvalidProviderConfigurationException) error).violations())
						.anyMatch(message -> message.contains("*-reference")));
	}

	@Test
	void requiresLdapsAndGroupMappingForLdapInProduction() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, Map.of(
						"url", "ldap://ldap.example:389",
						"base-dn", "dc=example,dc=org",
						"user-search-base", "ou=people",
						"user-search-filter", "(uid={0})",
						"group-search-base", "ou=groups",
						"group-search-filter", "(member={0})",
						"bind-dn", "cn=service,dc=example,dc=org",
						"bind-credential-reference", "secret://identity/ldap/bind-password"),
				Map.of("subject", "uid", "username", "uid"), Instant.EPOCH);

		assertThatThrownBy(() -> validator.validate(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.contains("configuration.url must use ldaps:// in production mode",
								"attributeMappings.groups is required"));
	}

	@Test
	void acceptsAnEntraSamlProviderWithMatchingRegistrationAndHttpsMetadata() {
		IdentityProviderDefinition provider = saml("corporate-entra", Map.of(
				"metadata-uri", "https://login.microsoftonline.com/tenant/federationmetadata/2007-06/federationmetadata.xml",
				"entity-id", "https://identity.example/saml2/sp",
				"registration-id", "corporate-entra",
				"metadata-cache-ttl-ms", "3600000",
				"assertion-consumer-service-location", "{baseUrl}/login/saml2/sso/{registrationId}"));

		assertThatCode(() -> validator.validate(provider)).doesNotThrowAnyException();
	}

	@Test
	void rejectsAmbiguousRegistrationAndIncompleteSigningCredentials() {
		IdentityProviderDefinition provider = saml("corporate-entra", Map.of(
				"metadata-uri", "https://login.microsoftonline.com/tenant/federationmetadata/2007-06/federationmetadata.xml",
				"entity-id", "https://identity.example/saml2/sp",
				"registration-id", "another-registration",
				"sign-authn-requests", "true",
				"signing-private-key-reference", "secret://identity/saml/signing-key"));

		assertThatThrownBy(() -> validator.validate(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.contains("configuration.registration-id must match the provider id",
								"configuration.signing credential requires both private key and certificate references"));
	}

	@Test
	void reportsEveryMalformedLdapSettingTogether() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, Map.ofEntries(
						Map.entry("url", "not a uri%"),
						Map.entry("base-dn", "[invalid"),
						Map.entry("user-search-base", "[invalid"),
						Map.entry("user-search-filter", "(uid=static)"),
						Map.entry("group-search-base", "[invalid"),
						Map.entry("group-search-filter", "(member=static)"),
						Map.entry("bind-dn", "[invalid"),
						Map.entry("bind-credential-reference", "invalid-reference"),
						Map.entry("connection-timeout-ms", "99"),
						Map.entry("read-timeout-ms", "not-a-number"),
						Map.entry("user-search-subtree", "sometimes")),
				Map.of("subject", "uid", "username", "uid", "groups", "memberOf"), Instant.EPOCH);

		assertThatThrownBy(() -> validator.validate(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.hasSizeGreaterThanOrEqualTo(10)
						.anyMatch(message -> message.contains("valid LDAP distinguished name"))
						.anyMatch(message -> message.contains("parameter placeholder"))
						.anyMatch(message -> message.contains("must be an integer")));
	}

	@Test
	void rejectsTrustCertificatesOnPlainLdap() {
		Map<String, String> configuration = new LinkedHashMap<>(Map.ofEntries(
				Map.entry("url", "ldap://ldap.example:389"),
				Map.entry("base-dn", "dc=example,dc=org"),
				Map.entry("user-search-base", "ou=people"),
				Map.entry("user-search-filter", "(uid={0})"),
				Map.entry("group-search-base", "ou=groups"),
				Map.entry("group-search-filter", "(&(member={0})(uid={1}))"),
				Map.entry("bind-dn", "cn=service,dc=example,dc=org"),
				Map.entry("bind-credential-reference", "secret://identity/ldap/bind-password"),
				Map.entry("trust-certificate-reference", "secret://identity/ldap/ca")));
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, configuration,
				Map.of("subject", "uid", "username", "uid", "groups", "memberOf"), Instant.EPOCH);

		assertThatThrownBy(() -> validator.validate(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.contains("configuration.trust-certificate-reference requires an ldaps:// URL"));
	}

	@Test
	void reportsMalformedSamlEndpointsAndLimits() {
		IdentityProviderDefinition provider = saml("corporate-entra", Map.ofEntries(
				Map.entry("metadata-uri", "http://login.example/metadata.xml"),
				Map.entry("entity-id", "/relative"),
				Map.entry("registration-id", "invalid id"),
				Map.entry("assertion-consumer-service-location", "http://identity.example/callback"),
				Map.entry("sign-authn-requests", "sometimes"),
				Map.entry("metadata-connect-timeout-ms", "99"),
				Map.entry("metadata-request-timeout-ms", "70000"),
				Map.entry("metadata-maximum-bytes", "not-a-number"),
				Map.entry("metadata-cache-ttl-ms", "10"),
				Map.entry("decryption-private-key-reference", "not-a-secret-reference")));

		assertThatThrownBy(() -> validator.validate(provider))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.hasSizeGreaterThanOrEqualTo(9)
						.anyMatch(message -> message.contains("absolute HTTPS URI"))
						.anyMatch(message -> message.contains("must use {baseUrl} or HTTPS"))
						.anyMatch(message -> message.contains("must be true or false")));
	}

	@Test
	void acceptsSecureLdapWithOptionalValuesAndAUsernameGroupPlaceholder() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, Map.ofEntries(
						Map.entry("url", "ldaps://ldap.example:636"),
						Map.entry("base-dn", "dc=example,dc=org"),
						Map.entry("user-search-base", "ou=people"),
						Map.entry("user-search-filter", "(uid={0})"),
						Map.entry("group-search-base", "ou=groups"),
						Map.entry("group-search-filter", "(|(member={0})(uid={1}))"),
						Map.entry("bind-dn", "cn=service,dc=example,dc=org"),
						Map.entry("bind-credential-reference", "secret://identity/ldap/bind-password"),
						Map.entry("connection-timeout-ms", "100"),
						Map.entry("read-timeout-ms", "60000"),
						Map.entry("user-search-subtree", "true")),
				Map.of("subject", "uid", "username", "uid", "groups", "memberOf"), Instant.EPOCH);

		assertThatCode(() -> validator.validate(provider)).doesNotThrowAnyException();
	}

	@Test
	void acceptsPlainLdapOutsideProductionButRejectsInvalidLocations() {
		DefaultProviderConfigurationValidator developmentValidator = new DefaultProviderConfigurationValidator(
				new IdentityAccessProperties(
						new IdentityAccessProperties.Session(Duration.ofMinutes(30), Duration.ofHours(8),
								"OBS_SESSION", false, "lax"),
						new IdentityAccessProperties.Token(URI.create("http://identity.example"), "obs-platform",
								Duration.ofMinutes(10), false, ""),
						new IdentityAccessProperties.Security(false, List.of("http://portal.example"))));
		Map<String, String> valid = new LinkedHashMap<>(Map.ofEntries(
				Map.entry("url", "ldap://ldap.example:389"),
				Map.entry("base-dn", "dc=example,dc=org"),
				Map.entry("user-search-base", "ou=people"),
				Map.entry("user-search-filter", "(uid={0})"),
				Map.entry("group-search-base", "ou=groups"),
				Map.entry("group-search-filter", "(member={0})"),
				Map.entry("bind-dn", "cn=service,dc=example,dc=org"),
				Map.entry("bind-credential-reference", "secret://identity/ldap/bind-password")));
		IdentityProviderDefinition plainLdap = ldap(valid);
		valid.put("url", "ldap://user@ldap.example:389/dc=example?query");
		IdentityProviderDefinition invalidLocation = ldap(valid);

		assertThatCode(() -> developmentValidator.validate(plainLdap)).doesNotThrowAnyException();
		assertThatThrownBy(() -> developmentValidator.validate(invalidLocation))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.contains("configuration.url must be an absolute ldap:// or ldaps:// URI without credentials"));
	}

	@Test
	void acceptsUrnEntityIdsHttpsCallbacksAndCompleteCredentialPairs() {
		IdentityProviderDefinition provider = saml("corporate-entra", Map.ofEntries(
				Map.entry("metadata-uri", "https://login.example/metadata.xml"),
				Map.entry("entity-id", "urn:porto:obs:identity"),
				Map.entry("registration-id", "corporate-entra"),
				Map.entry("assertion-consumer-service-location", "https://identity.example/login/saml2/sso"),
				Map.entry("sign-authn-requests", "false"),
				Map.entry("signing-private-key-reference", "secret://identity/saml/signing-key"),
				Map.entry("signing-certificate-reference", "secret://identity/saml/signing-cert"),
				Map.entry("decryption-private-key-reference", "secret://identity/saml/decryption-key"),
				Map.entry("decryption-certificate-reference", "secret://identity/saml/decryption-cert"),
				Map.entry("metadata-maximum-bytes", "1024"),
				Map.entry("metadata-cache-ttl-ms", "86400000")));

		assertThatCode(() -> validator.validate(provider)).doesNotThrowAnyException();
	}

	@Test
	void reportsMissingSamlIdentifiersAndUnsafeBaseUrlTemplates() {
		IdentityProviderDefinition missing = saml("corporate-entra", Map.of(
				"metadata-uri", "https://login.example/metadata.xml"));
		IdentityProviderDefinition unsafeTemplate = saml("corporate-entra", Map.of(
				"metadata-uri", "https://login.example/metadata.xml",
				"entity-id", "https://identity.example/saml2/sp#fragment",
				"registration-id", "corporate-entra",
				"assertion-consumer-service-location", "{baseUrl}/../callback?redirect=evil"));

		assertThatThrownBy(() -> validator.validate(missing))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.contains("configuration.entity-id is required", "configuration.registration-id is required"));
		assertThatThrownBy(() -> validator.validate(unsafeTemplate))
				.isInstanceOf(InvalidProviderConfigurationException.class)
				.satisfies(error -> assertThat(((InvalidProviderConfigurationException) error).violations())
						.anyMatch(message -> message.contains("absolute HTTPS or URN"))
						.anyMatch(message -> message.contains("must use {baseUrl} or HTTPS")));
	}

	private static IdentityProviderDefinition oidc(Map<String, String> configuration) {
		return IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"), "Corporate OIDC",
				ProviderType.OIDC, 0, configuration,
				Map.of("subject", "sub", "username", "preferred_username"), Instant.EPOCH);
	}

	private static IdentityProviderDefinition saml(String providerId, Map<String, String> configuration) {
		return IdentityProviderDefinition.draft(new ProviderId(providerId), "Microsoft Entra ID",
				ProviderType.SAML, 0, configuration,
				Map.of("subject", "objectidentifier", "username", "emailaddress"), Instant.EPOCH);
	}

	private static IdentityProviderDefinition ldap(Map<String, String> configuration) {
		return IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"), "Corporate LDAP",
				ProviderType.LDAP, 0, configuration,
				Map.of("subject", "uid", "username", "uid", "groups", "memberOf"), Instant.EPOCH);
	}
}
