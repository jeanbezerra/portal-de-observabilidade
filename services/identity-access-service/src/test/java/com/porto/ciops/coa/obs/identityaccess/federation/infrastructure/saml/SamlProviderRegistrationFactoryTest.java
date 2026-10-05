package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import com.unboundid.ldap.listener.SelfSignedCertificateGenerator;
import com.unboundid.util.ObjectPair;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.saml2.provider.service.authentication.Saml2RedirectAuthenticationRequest;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration;
import org.springframework.security.saml2.provider.service.registration.Saml2MessageBinding;
import org.springframework.security.saml2.provider.service.web.authentication.OpenSaml5AuthenticationRequestResolver;

class SamlProviderRegistrationFactoryTest {
	private static final int METADATA_OUTAGE_ATTEMPT = 2;

	@Test
	void buildsAuthnRequestAndRefreshesAnEntraCompatibleRegistrationFromSignedMetadata() throws Exception {
		try (TemporaryKeyStore keyStore = TemporaryKeyStore.create("saml-metadata-test")) {
			String certificate = certificateBase64(keyStore.file(), keyStore.password());
			String metadata = metadata(certificate);
			AtomicInteger loads = new AtomicInteger();
			SamlMetadataLoader loader = (uri, connectTimeout, requestTimeout, maximumBytes) -> {
				if (loads.incrementAndGet() == METADATA_OUTAGE_ATTEMPT) {
					throw new IllegalStateException("simulated metadata outage");
				}
				return metadata.getBytes(java.nio.charset.StandardCharsets.UTF_8);
			};
			SamlProviderRegistrationFactory factory = new SamlProviderRegistrationFactory(loader,
					reference -> {
						throw new AssertionError("no service provider credential is configured");
					});
			IdentityProviderDefinition provider = enabledProvider();
			MutableClock clock = new MutableClock(Instant.parse("2026-10-05T00:00:00Z"));
			DynamicSamlRelyingPartyRegistrationRepository repository =
					new DynamicSamlRelyingPartyRegistrationRepository(registry(provider), factory, clock);

			RelyingPartyRegistration first = repository.findByRegistrationId(provider.id().value());
			RelyingPartyRegistration second = repository.findByRegistrationId(provider.id().value());

			assertThat(first).isSameAs(second);
			assertThat(first.getRegistrationId()).isEqualTo("corporate-entra");
			assertThat(first.getEntityId()).isEqualTo("https://identity.example/saml2/sp");
			assertThat(first.getAssertionConsumerServiceLocation())
					.isEqualTo("{baseUrl}/login/saml2/sso/{registrationId}");
			assertThat(first.getAssertingPartyMetadata().getEntityId()).isEqualTo("https://sts.example/tenant/");
			assertThat(first.getAssertingPartyMetadata().getVerificationX509Credentials()).hasSize(1);
			assertThat(loads).hasValue(1);

			OpenSaml5AuthenticationRequestResolver resolver = new OpenSaml5AuthenticationRequestResolver(repository);
			MockHttpServletRequest request = new MockHttpServletRequest("GET",
					"/saml2/authenticate/corporate-entra");
			request.setScheme("https");
			request.setServerName("identity.example");
			request.setServerPort(443);
			request.setServletPath("/saml2/authenticate/corporate-entra");
			Saml2RedirectAuthenticationRequest authenticationRequest = resolver.resolve(request);

			assertThat(authenticationRequest).isNotNull();
			assertThat(authenticationRequest.getRelyingPartyRegistrationId()).isEqualTo("corporate-entra");
			assertThat(authenticationRequest.getAuthenticationRequestUri())
					.isEqualTo("https://login.example/saml2/sso");
			assertThat(authenticationRequest.getSamlRequest()).isNotBlank();
			assertThat(authenticationRequest.getBinding()).isEqualTo(Saml2MessageBinding.REDIRECT);

			clock.advanceSeconds(60);
			assertThat(repository.findByRegistrationId(provider.id().value())).isSameAs(first);
			assertThat(loads).hasValue(2);
			clock.advanceSeconds(60);
			assertThat(repository.findByRegistrationId(provider.id().value())).isNotSameAs(first);
			assertThat(loads).hasValue(3);
		}
	}

	@Test
	void loadsSigningAndDecryptionCredentialsFromSecretReferences() throws Exception {
		try (TemporaryKeyStore keyStore = TemporaryKeyStore.create("saml-credentials-test")) {
			KeyMaterial material = keyMaterial(keyStore.file(), keyStore.password());
			SamlProviderRegistrationFactory factory = new SamlProviderRegistrationFactory(
					(uri, connectTimeout, requestTimeout, maximumBytes) ->
							metadata(material.certificateBase64()).getBytes(java.nio.charset.StandardCharsets.UTF_8),
					reference -> new SecretValue((reference.value().contains("PRIVATE_KEY")
							? material.privateKeyPem() : material.certificatePem()).toCharArray()));
			IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("signed-saml"),
					"Signed SAML", ProviderType.SAML, 0, Map.ofEntries(
							Map.entry("metadata-uri", "https://login.example/metadata.xml"),
							Map.entry("entity-id", "https://identity.example/saml2/sp"),
							Map.entry("registration-id", "signed-saml"),
							Map.entry("sign-authn-requests", "true"),
							Map.entry("signing-private-key-reference", "secret://env/SAML_PRIVATE_KEY"),
							Map.entry("signing-certificate-reference", "secret://env/SAML_CERTIFICATE"),
							Map.entry("decryption-private-key-reference", "secret://env/SAML_PRIVATE_KEY"),
							Map.entry("decryption-certificate-reference", "secret://env/SAML_CERTIFICATE")),
					Map.of("subject", "name-id", "username", "email"), Instant.EPOCH);

			RelyingPartyRegistration registration = factory.create(provider);

			assertThat(registration.isAuthnRequestsSigned()).isTrue();
			assertThat(registration.getSigningX509Credentials()).hasSize(1);
			assertThat(registration.getDecryptionX509Credentials()).hasSize(1);

			SamlProviderRegistrationFactory invalidFactory = new SamlProviderRegistrationFactory(
					(uri, connectTimeout, requestTimeout, maximumBytes) ->
							metadata(material.certificateBase64()).getBytes(java.nio.charset.StandardCharsets.UTF_8),
					reference -> new SecretValue("not-a-pem".toCharArray()));
			assertThatThrownBy(() -> invalidFactory.create(provider)).isInstanceOf(IllegalStateException.class)
					.hasMessageContaining("credential");
		}
	}

	private static IdentityProviderDefinition enabledProvider() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-entra"),
				"Microsoft Entra ID", ProviderType.SAML, 0, Map.of(
						"metadata-uri", "https://login.microsoftonline.com/tenant/federationmetadata/2007-06/federationmetadata.xml",
						"entity-id", "https://identity.example/saml2/sp",
						"registration-id", "corporate-entra",
						"metadata-cache-ttl-ms", "60000"),
				Map.of("subject", "objectidentifier", "username", "emailaddress"), Instant.EPOCH);
		provider.markValidated(Instant.EPOCH.plusSeconds(1));
		provider.enable(Instant.EPOCH.plusSeconds(2));
		return provider;
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
				return provider.id().equals(providerId) ? Optional.of(provider) : Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return List.of(provider);
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}

	private static String certificateBase64(java.io.File keyStoreFile, char[] password) throws Exception {
		KeyStore keyStore = KeyStore.getInstance("JKS");
		try (var input = Files.newInputStream(keyStoreFile.toPath())) {
			keyStore.load(input, password);
		}
		Certificate certificate = keyStore.getCertificate(keyStore.aliases().nextElement());
		return Base64.getEncoder().encodeToString(certificate.getEncoded());
	}

	private static KeyMaterial keyMaterial(java.io.File keyStoreFile, char[] password) throws Exception {
		KeyStore keyStore = KeyStore.getInstance("JKS");
		try (var input = Files.newInputStream(keyStoreFile.toPath())) {
			keyStore.load(input, password);
		}
		String alias = keyStore.aliases().nextElement();
		PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, password);
		Certificate certificate = keyStore.getCertificate(alias);
		return new KeyMaterial(pem("PRIVATE KEY", privateKey.getEncoded()),
				pem("CERTIFICATE", certificate.getEncoded()),
				Base64.getEncoder().encodeToString(certificate.getEncoded()));
	}

	private static String pem(String label, byte[] content) {
		return "-----BEGIN " + label + "-----\n"
				+ Base64.getMimeEncoder(64, new byte[] { '\n' }).encodeToString(content)
				+ "\n-----END " + label + "-----\n";
	}

	private static String metadata(String certificate) {
		return """
				<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
				    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
				    entityID="https://sts.example/tenant/">
				  <md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
				    <md:KeyDescriptor use="signing">
				      <ds:KeyInfo><ds:X509Data><ds:X509Certificate>%s</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
				    </md:KeyDescriptor>
				    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
				        Location="https://login.example/saml2/sso"/>
				  </md:IDPSSODescriptor>
				</md:EntityDescriptor>
				""".replace("%s", certificate);
	}

	private static final class MutableClock extends Clock {

		private final AtomicReference<Instant> current;

		private MutableClock(Instant initial) {
			this.current = new AtomicReference<>(initial);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return current.get();
		}

		private void advanceSeconds(long seconds) {
			current.updateAndGet(value -> value.plusSeconds(seconds));
		}
	}

	private record KeyMaterial(String privateKeyPem, String certificatePem, String certificateBase64) {
	}

	private static final class TemporaryKeyStore implements AutoCloseable {
		private final java.io.File file;
		private final char[] password;

		private TemporaryKeyStore(java.io.File file, char[] password) {
			this.file = file;
			this.password = password;
		}

		private static TemporaryKeyStore create(String commonName) throws Exception {
			ObjectPair<java.io.File, char[]> generated = SelfSignedCertificateGenerator
					.generateTemporarySelfSignedCertificate(commonName, "JKS");
			return new TemporaryKeyStore(generated.getFirst(), generated.getSecond());
		}

		private java.io.File file() {
			return file;
		}

		private char[] password() {
			return password;
		}

		@Override
		public void close() throws java.io.IOException {
			Arrays.fill(password, '\0');
			Files.deleteIfExists(file.toPath());
		}
	}
}
