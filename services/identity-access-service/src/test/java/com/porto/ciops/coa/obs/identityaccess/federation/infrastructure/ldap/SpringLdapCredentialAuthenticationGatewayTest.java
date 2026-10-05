package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.ldap;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetAddress;
import java.nio.file.Files;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationResult;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationRequest;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import com.unboundid.ldap.sdk.LDAPInterface;
import com.unboundid.ldap.listener.InMemoryDirectoryServer;
import com.unboundid.ldap.listener.InMemoryDirectoryServerConfig;
import com.unboundid.ldap.listener.InMemoryListenerConfig;
import com.unboundid.ldap.listener.SelfSignedCertificateGenerator;
import com.unboundid.util.ObjectPair;
import com.unboundid.util.ssl.KeyStoreKeyManager;
import com.unboundid.util.ssl.SSLUtil;
import com.unboundid.util.ssl.TrustAllTrustManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class SpringLdapCredentialAuthenticationGatewayTest {

	private static final int SUBJECT_ALTERNATIVE_NAME_DNS = 2;
	private static final int SUBJECT_ALTERNATIVE_NAME_IP = 7;

	private InMemoryDirectoryServer ldap;
	private SpringLdapCredentialAuthenticationGateway gateway;

	@BeforeEach
	void startLdap() throws Exception {
		InMemoryDirectoryServerConfig configuration = new InMemoryDirectoryServerConfig("dc=example,dc=org");
		configuration.addAdditionalBindCredentials("cn=admin,dc=example,dc=org", "bind-password");
		ldap = new InMemoryDirectoryServer(configuration);
		ldap.startListening();
		populate(ldap);
		SecretResolver secrets = reference -> new SecretValue("bind-password".toCharArray());
		gateway = new SpringLdapCredentialAuthenticationGateway(secrets, new ProviderTlsContextFactory(secrets));
	}

	private static void populate(LDAPInterface server) throws Exception {
		server.add("dn: dc=example,dc=org", "objectClass: top", "objectClass: domain", "dc: example");
		server.add("dn: ou=people,dc=example,dc=org", "objectClass: top", "objectClass: organizationalUnit",
				"ou: people");
		server.add("dn: ou=groups,dc=example,dc=org", "objectClass: top", "objectClass: organizationalUnit",
				"ou: groups");
		server.add("dn: uid=maria,ou=people,dc=example,dc=org", "objectClass: top", "objectClass: inetOrgPerson",
				"uid: maria", "sn: Silva", "cn: Maria Silva", "mail: maria@example.com",
				"userPassword: user-password");
		server.add("dn: cn=operations,ou=groups,dc=example,dc=org", "objectClass: top",
				"objectClass: groupOfNames", "cn: operations", "member: uid=maria,ou=people,dc=example,dc=org");
	}

	@AfterEach
	void stopLdap() {
		ldap.shutDown(true);
	}

	@Test
	void authenticatesAndExtractsMappedAttributesAndGroups() {
		AuthenticationResult result;
		try (CredentialAuthenticationRequest request = new CredentialAuthenticationRequest("maria",
				"user-password".toCharArray())) {
			result = gateway.authenticate(provider("ldap://127.0.0.1:" + ldap.getListenPort(), false), request);
		}

		assertThat(result.authenticated()).isTrue();
		assertThat(result.identity().externalSubject()).isEqualTo("maria");
		assertThat(result.identity().attributes())
				.containsEntry("uid", "maria")
				.containsEntry("mail", "maria@example.com")
				.containsEntry("memberOf", java.util.Set.of("operations"));
	}

	@Test
	void rejectsInvalidCredentialsWithoutLeakingThem() {
		AuthenticationResult result;
		try (CredentialAuthenticationRequest request = new CredentialAuthenticationRequest("maria",
				"wrong-password".toCharArray())) {
			result = gateway.authenticate(provider("ldap://127.0.0.1:" + ldap.getListenPort(), false), request);
			assertThat(request.toString()).doesNotContain("wrong-password");
		}

		assertThat(result.authenticated()).isFalse();
		assertThat(result.failureCode()).isEqualTo("invalid-credentials");
	}

	@Test
	void authenticatesWithLdapsAndAProviderSpecificTrustCertificate() throws Exception {
		ObjectPair<java.io.File, char[]> keyStoreFile = SelfSignedCertificateGenerator
				.generateTemporarySelfSignedCertificate("localhost", "JKS");
		char[] keyStorePassword = keyStoreFile.getSecond();
		String certificateHost = certificateHost(keyStoreFile.getFirst(), keyStorePassword);
		InetAddress localAddress = InetAddress.getByName(certificateHost);
		KeyStoreKeyManager keyManager = new KeyStoreKeyManager(keyStoreFile.getFirst(), keyStorePassword, "JKS", null);
		SSLUtil serverTls = new SSLUtil(keyManager, new TrustAllTrustManager());
		InMemoryListenerConfig listener = InMemoryListenerConfig.createLDAPSConfig("LDAPS",
				localAddress, 0, serverTls.createSSLServerSocketFactory(),
				serverTls.createSSLSocketFactory());
		InMemoryDirectoryServerConfig configuration = new InMemoryDirectoryServerConfig("dc=example,dc=org");
		configuration.addAdditionalBindCredentials("cn=admin,dc=example,dc=org", "bind-password");
		configuration.setListenerConfigs(listener);
		InMemoryDirectoryServer secureLdap = new InMemoryDirectoryServer(configuration);
		try (var _ = (AutoCloseable) () -> secureLdap.shutDown(true)) {
			secureLdap.startListening();
			populate(secureLdap);
			String certificatePem = certificatePem(keyStoreFile.getFirst(), keyStorePassword);
			SecretResolver secrets = reference -> new SecretValue((reference.value()
					.endsWith("LDAP_TRUST_CERTIFICATE") ? certificatePem : "bind-password").toCharArray());
			SpringLdapCredentialAuthenticationGateway secureGateway = new SpringLdapCredentialAuthenticationGateway(
					secrets, new ProviderTlsContextFactory(secrets));

			AuthenticationResult result;
			try (CredentialAuthenticationRequest request = new CredentialAuthenticationRequest("maria",
					"user-password".toCharArray())) {
				result = secureGateway.authenticate(provider("ldaps://" + certificateHost + ":"
						+ secureLdap.getListenPort("LDAPS"),
						true), request);
			}

			assertThat(result.authenticated()).isTrue();
			assertThat(result.identity().attributes()).containsEntry("memberOf", java.util.Set.of("operations"));
		}
		finally {
			Arrays.fill(keyStorePassword, '\0');
			Files.deleteIfExists(keyStoreFile.getFirst().toPath());
		}
	}

	private static String certificatePem(java.io.File keyStoreFile, char[] password) throws Exception {
		Certificate certificate = certificate(keyStoreFile, password);
		return "-----BEGIN CERTIFICATE-----\n"
				+ Base64.getMimeEncoder(64, new byte[] { '\n' }).encodeToString(certificate.getEncoded())
				+ "\n-----END CERTIFICATE-----\n";
	}

	private static String certificateHost(java.io.File keyStoreFile, char[] password) throws Exception {
		X509Certificate certificate = (X509Certificate) certificate(keyStoreFile, password);
		for (var name : certificate.getSubjectAlternativeNames()) {
			int type = (Integer) name.getFirst();
			if (type == SUBJECT_ALTERNATIVE_NAME_DNS || type == SUBJECT_ALTERNATIVE_NAME_IP) {
				return String.valueOf(name.get(1));
			}
		}
		throw new IllegalStateException("The generated certificate has no usable subject alternative name");
	}

	private static Certificate certificate(java.io.File keyStoreFile, char[] password) throws Exception {
		KeyStore keyStore = KeyStore.getInstance("JKS");
		try (var input = Files.newInputStream(keyStoreFile.toPath())) {
			keyStore.load(input, password);
		}
		String alias = keyStore.aliases().nextElement();
		return keyStore.getCertificate(alias);
	}

	private IdentityProviderDefinition provider(String url, boolean customTrust) {
		Map<String, String> configuration = new LinkedHashMap<>(Map.ofEntries(
				Map.entry("url", url),
				Map.entry("base-dn", "dc=example,dc=org"),
				Map.entry("user-search-base", "ou=people"),
				Map.entry("user-search-filter", "(uid={0})"),
				Map.entry("group-search-base", "ou=groups"),
				Map.entry("group-search-filter", "(member={0})"),
				Map.entry("group-role-attribute", "cn"),
				Map.entry("bind-dn", "cn=admin,dc=example,dc=org"),
				Map.entry("bind-credential-reference", "secret://env/LDAP_BIND_PASSWORD"),
				Map.entry("connection-timeout-ms", "2000"),
				Map.entry("read-timeout-ms", "2000")));
		if (customTrust) {
			configuration.put("trust-certificate-reference", "secret://env/LDAP_TRUST_CERTIFICATE");
		}
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, configuration,
				Map.of("subject", "uid", "username", "uid", "email", "mail",
						"displayName", "cn", "groups", "memberOf"), Instant.EPOCH);
		provider.markValidated(Instant.EPOCH.plusSeconds(1));
		provider.enable(Instant.EPOCH.plusSeconds(2));
		return provider;
	}
}
