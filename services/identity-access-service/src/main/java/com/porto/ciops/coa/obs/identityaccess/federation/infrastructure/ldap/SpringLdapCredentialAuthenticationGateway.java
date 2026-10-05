package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.ldap;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationResult;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationGateway;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationRequest;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import io.micrometer.observation.annotation.Observed;
import org.springframework.ldap.core.DirContextOperations;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.ldap.DefaultSpringSecurityContextSource;
import org.springframework.security.ldap.authentication.BindAuthenticator;
import org.springframework.security.ldap.search.FilterBasedLdapUserSearch;
import org.springframework.stereotype.Component;

@Component
class SpringLdapCredentialAuthenticationGateway implements CredentialAuthenticationGateway {

	private static final int DEFAULT_CONNECT_TIMEOUT_MILLIS = 5_000;
	private static final int DEFAULT_READ_TIMEOUT_MILLIS = 10_000;
	private static final String TRUST_CERTIFICATE_REFERENCE = "trust-certificate-reference";
	private final SecretResolver secretResolver;
	private final ProviderTlsContextFactory tlsContextFactory;

	SpringLdapCredentialAuthenticationGateway(SecretResolver secretResolver,
			ProviderTlsContextFactory tlsContextFactory) {
		this.secretResolver = secretResolver;
		this.tlsContextFactory = tlsContextFactory;
	}

	@Override
	@Observed(name = "identity.ldap.authenticate")
	public AuthenticationResult authenticate(IdentityProviderDefinition provider,
			CredentialAuthenticationRequest request) {
		if (provider.type() != ProviderType.LDAP) {
			throw new IllegalArgumentException("The credential adapter only supports LDAP providers");
		}

		Map<String, String> configuration = provider.configuration();
		char[] bindCredential = null;
		char[] userCredential = request.credential();
		UsernamePasswordAuthenticationToken authentication = null;
		try (SecretValue secret = secretResolver.resolve(
				new SecretReference(configuration.get("bind-credential-reference")));
				var _ = tlsContextFactory.open(configuration)) {
			bindCredential = secret.reveal();
			DefaultSpringSecurityContextSource contextSource = contextSource(configuration,
					new String(bindCredential));
			contextSource.afterPropertiesSet();

			FilterBasedLdapUserSearch userSearch = new FilterBasedLdapUserSearch(
					configuration.get("user-search-base"), configuration.get("user-search-filter"), contextSource);
			userSearch.setSearchSubtree(booleanValue(configuration, "user-search-subtree", true));
			userSearch.setSearchTimeLimit(integerValue(configuration, "read-timeout-ms",
					DEFAULT_READ_TIMEOUT_MILLIS));
			userSearch.setReturningAttributes(requestedAttributes(provider));

			BindAuthenticator authenticator = new BindAuthenticator(contextSource);
			authenticator.setUserSearch(userSearch);
			authenticator.afterPropertiesSet();
			authentication = UsernamePasswordAuthenticationToken.unauthenticated(request.username(),
					new String(userCredential));
			DirContextOperations user = authenticator.authenticate(authentication);
			return AuthenticationResult.success(LdapIdentityMapper.map(provider, configuration,
					contextSource, user, request.username()));
		}
		catch (BadCredentialsException | UsernameNotFoundException _) {
			return AuthenticationResult.failure("invalid-credentials");
		}
		catch (Exception exception) {
			throw new ProviderAuthenticationUnavailableException(provider.id(), exception);
		}
		finally {
			if (authentication != null) {
				authentication.eraseCredentials();
			}
			Arrays.fill(userCredential, '\0');
			if (bindCredential != null) {
				Arrays.fill(bindCredential, '\0');
			}
		}
	}

	private static DefaultSpringSecurityContextSource contextSource(Map<String, String> configuration,
			String bindPassword) {
		DefaultSpringSecurityContextSource source = new DefaultSpringSecurityContextSource(
				List.of(configuration.get("url")), configuration.get("base-dn"));
		source.setUserDn(configuration.get("bind-dn"));
		source.setPassword(bindPassword);
		source.setPooled(false);
		Map<String, Object> environment = new HashMap<>();
		environment.put("com.sun.jndi.ldap.connect.timeout", String.valueOf(integerValue(configuration,
				"connection-timeout-ms", DEFAULT_CONNECT_TIMEOUT_MILLIS)));
		environment.put("com.sun.jndi.ldap.read.timeout", String.valueOf(integerValue(configuration,
				"read-timeout-ms", DEFAULT_READ_TIMEOUT_MILLIS)));
		if (configuration.get(TRUST_CERTIFICATE_REFERENCE) != null) {
			environment.put("java.naming.ldap.factory.socket", ProviderTlsSocketFactory.class.getName());
		}
		source.setBaseEnvironmentProperties(environment);
		return source;
	}

	private static String[] requestedAttributes(IdentityProviderDefinition provider) {
		return provider.attributeMappings().values().stream().distinct().toArray(String[]::new);
	}

	private static int integerValue(Map<String, String> configuration, String key, int defaultValue) {
		String value = configuration.get(key);
		return value == null ? defaultValue : Integer.parseInt(value);
	}

	private static boolean booleanValue(Map<String, String> configuration, String key, boolean defaultValue) {
		String value = configuration.get(key);
		return value == null ? defaultValue : Boolean.parseBoolean(value);
	}
}
