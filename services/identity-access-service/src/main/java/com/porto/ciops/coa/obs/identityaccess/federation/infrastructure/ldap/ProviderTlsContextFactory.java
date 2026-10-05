package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.ldap;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.Arrays;
import java.util.Collection;
import java.util.Map;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;

import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import org.springframework.stereotype.Component;

@Component
final class ProviderTlsContextFactory {

	private static final String TRUST_CERTIFICATE_REFERENCE = "trust-certificate-reference";
	private final SecretResolver secretResolver;

	ProviderTlsContextFactory(SecretResolver secretResolver) {
		this.secretResolver = secretResolver;
	}

	ProviderTlsSocketFactory.Scope open(Map<String, String> configuration)
			throws java.security.GeneralSecurityException {
		String reference = configuration.get(TRUST_CERTIFICATE_REFERENCE);
		return reference == null
				? ProviderTlsSocketFactory.noTls()
				: ProviderTlsSocketFactory.use(trustedSocketFactory(reference));
	}

	private SSLSocketFactory trustedSocketFactory(String reference)
			throws java.security.GeneralSecurityException {
		char[] certificateValue = null;
		try (SecretValue secret = secretResolver.resolve(new SecretReference(reference))) {
			certificateValue = secret.reveal();
			Collection<? extends Certificate> certificates = certificates(certificateValue);
			KeyStore trustStore = trustStore(certificates);
			TrustManagerFactory trustManagers = TrustManagerFactory.getInstance(
					TrustManagerFactory.getDefaultAlgorithm());
			trustManagers.init(trustStore);
			SSLContext context = SSLContext.getInstance("TLS");
			context.init(null, trustManagers.getTrustManagers(), null);
			return context.getSocketFactory();
		}
		finally {
			if (certificateValue != null) {
				Arrays.fill(certificateValue, '\0');
			}
		}
	}

	private static Collection<? extends Certificate> certificates(char[] certificateValue)
			throws java.security.cert.CertificateException {
		CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
		Collection<? extends Certificate> certificates = certificateFactory.generateCertificates(
				new ByteArrayInputStream(new String(certificateValue).getBytes(StandardCharsets.US_ASCII)));
		if (certificates.isEmpty()) {
			throw new java.security.cert.CertificateException("No trusted certificate was provided");
		}
		return certificates;
	}

	private static KeyStore trustStore(Collection<? extends Certificate> certificates)
			throws java.security.GeneralSecurityException {
		KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
		try {
			trustStore.load(null, null);
		}
		catch (java.io.IOException exception) {
			throw new java.security.KeyStoreException("Unable to initialize the provider trust store", exception);
		}
		int index = 0;
		for (Certificate certificate : certificates) {
			trustStore.setCertificateEntry("provider-" + index, certificate);
			index++;
		}
		return trustStore;
	}
}
