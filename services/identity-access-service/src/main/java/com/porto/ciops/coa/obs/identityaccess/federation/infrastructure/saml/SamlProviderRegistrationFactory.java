package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import org.springframework.security.saml2.core.Saml2X509Credential;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrations;
import org.springframework.stereotype.Component;

@Component
class SamlProviderRegistrationFactory {

	private static final int DEFAULT_CONNECT_TIMEOUT_MILLIS = 5_000;
	private static final int DEFAULT_REQUEST_TIMEOUT_MILLIS = 10_000;
	private static final int DEFAULT_MAXIMUM_METADATA_BYTES = 1_048_576;
	private static final List<String> PRIVATE_KEY_ALGORITHMS = List.of("RSA", "EC", "DSA");
	private static final Pattern PEM_WHITESPACE = Pattern.compile("\\s");
	private final SamlMetadataLoader metadataLoader;
	private final SecretResolver secretResolver;

	SamlProviderRegistrationFactory(SamlMetadataLoader metadataLoader, SecretResolver secretResolver) {
		this.metadataLoader = metadataLoader;
		this.secretResolver = secretResolver;
	}

	RelyingPartyRegistration create(IdentityProviderDefinition provider) {
		Map<String, String> configuration = provider.configuration();
		byte[] metadata = metadataLoader.load(URI.create(configuration.get("metadata-uri")),
				Duration.ofMillis(integerValue(configuration, "metadata-connect-timeout-ms",
						DEFAULT_CONNECT_TIMEOUT_MILLIS)),
				Duration.ofMillis(integerValue(configuration, "metadata-request-timeout-ms",
						DEFAULT_REQUEST_TIMEOUT_MILLIS)),
				integerValue(configuration, "metadata-maximum-bytes", DEFAULT_MAXIMUM_METADATA_BYTES));
		try (ByteArrayInputStream input = new ByteArrayInputStream(metadata)) {
			RelyingPartyRegistration.Builder builder = RelyingPartyRegistrations.fromMetadata(input)
					.registrationId(configuration.get("registration-id"))
					.entityId(configuration.get("entity-id"))
					.assertionConsumerServiceLocation(configuration.getOrDefault("assertion-consumer-service-location",
							"{baseUrl}/login/saml2/sso/{registrationId}"));
			String signAuthenticationRequests = configuration.get("sign-authn-requests");
			if (signAuthenticationRequests != null) {
				builder.authnRequestsSigned(booleanObject(signAuthenticationRequests));
			}
			Saml2X509Credential signing = credential(configuration, "signing", true);
			if (signing != null) {
				builder.signingX509Credentials(credentials -> credentials.add(signing));
			}
			Saml2X509Credential decryption = credential(configuration, "decryption", false);
			if (decryption != null) {
				builder.decryptionX509Credentials(credentials -> credentials.add(decryption));
			}
			RelyingPartyRegistration registration = builder.build();
			if (registration.getAssertingPartyMetadata().getVerificationX509Credentials().isEmpty()) {
				throw new IllegalStateException("SAML metadata does not contain a response verification certificate");
			}
			return registration;
		}
		catch (java.io.IOException exception) {
			throw new IllegalStateException("Unable to read SAML metadata", exception);
		}
		finally {
			Arrays.fill(metadata, (byte) 0);
		}
	}

	private Saml2X509Credential credential(Map<String, String> configuration, String purpose, boolean signing) {
		String keyReference = configuration.get(purpose + "-private-key-reference");
		String certificateReference = configuration.get(purpose + "-certificate-reference");
		if (keyReference == null || certificateReference == null) {
			return null;
		}
		char[] keyValue = null;
		char[] certificateValue = null;
		try (SecretValue keySecret = secretResolver.resolve(new SecretReference(keyReference));
				SecretValue certificateSecret = secretResolver.resolve(new SecretReference(certificateReference))) {
			keyValue = keySecret.reveal();
			certificateValue = certificateSecret.reveal();
			PrivateKey privateKey = privateKey(keyValue);
			X509Certificate certificate = certificate(certificateValue);
			return signing ? Saml2X509Credential.signing(privateKey, certificate)
					: Saml2X509Credential.decryption(privateKey, certificate);
		}
		catch (GeneralSecurityException exception) {
			throw new IllegalStateException("Unable to load a SAML service provider credential", exception);
		}
		finally {
			if (keyValue != null) {
				Arrays.fill(keyValue, '\0');
			}
			if (certificateValue != null) {
				Arrays.fill(certificateValue, '\0');
			}
		}
	}

	private static PrivateKey privateKey(char[] pemValue) throws GeneralSecurityException {
		byte[] encoded = decodePem(pemValue, "PRIVATE KEY");
		try {
			PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
			GeneralSecurityException lastFailure = null;
			for (String algorithm : PRIVATE_KEY_ALGORITHMS) {
				try {
					return KeyFactory.getInstance(algorithm).generatePrivate(keySpec);
				}
				catch (GeneralSecurityException exception) {
					lastFailure = exception;
				}
			}
			throw new GeneralSecurityException("Unsupported PKCS#8 private key algorithm", lastFailure);
		}
		finally {
			Arrays.fill(encoded, (byte) 0);
		}
	}

	private static X509Certificate certificate(char[] pemValue) throws GeneralSecurityException {
		byte[] bytes = new String(pemValue).getBytes(StandardCharsets.US_ASCII);
		try (ByteArrayInputStream input = new ByteArrayInputStream(bytes)) {
			return (X509Certificate) CertificateFactory.getInstance("X.509").generateCertificate(input);
		}
		catch (java.io.IOException exception) {
			throw new GeneralSecurityException("Unable to read the X.509 certificate", exception);
		}
		finally {
			Arrays.fill(bytes, (byte) 0);
		}
	}

	private static byte[] decodePem(char[] value, String label) throws GeneralSecurityException {
		String pem = new String(value);
		String begin = "-----BEGIN " + label + "-----";
		String end = "-----END " + label + "-----";
		int start = pem.indexOf(begin);
		int finish = pem.indexOf(end);
		if (start < 0 || finish <= start) {
			throw new GeneralSecurityException("The private key must use unencrypted PKCS#8 PEM format");
		}
		String content = PEM_WHITESPACE.matcher(pem.substring(start + begin.length(), finish)).replaceAll("");
		try {
			return Base64.getDecoder().decode(content);
		}
		catch (IllegalArgumentException exception) {
			throw new GeneralSecurityException("The private key PEM is invalid", exception);
		}
	}

	private static int integerValue(Map<String, String> configuration, String key, int defaultValue) {
		String value = configuration.get(key);
		return value == null ? defaultValue : Integer.parseInt(value);
	}

	private static Boolean booleanObject(String value) {
		return "true".equalsIgnoreCase(value) ? Boolean.TRUE : Boolean.FALSE;
	}
}
