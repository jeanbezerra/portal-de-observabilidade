package com.porto.ciops.coa.obs.identityaccess.secrets.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretReference;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolutionException;
import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretValue;
import org.junit.jupiter.api.Test;

class EnvironmentSecretResolverTest {

	@Test
	void resolvesExplicitEnvironmentReferences() {
		EnvironmentSecretResolver resolver = new EnvironmentSecretResolver(Map.of("LDAP_BIND_PASSWORD", "s3cret"));

		try (SecretValue value = resolver.resolve(new SecretReference("secret://env/LDAP_BIND_PASSWORD"))) {
			assertThat(value.reveal()).containsExactly("s3cret".toCharArray());
			assertThat(value.toString()).doesNotContain("s3cret");
		}
	}

	@Test
	void resolvesNamespacedReferencesToObsEnvironmentVariables() {
		EnvironmentSecretResolver resolver = new EnvironmentSecretResolver(
				Map.of("OBS_SECRET_IDENTITY_LDAP_BIND_PASSWORD", "s3cret"));

		try (SecretValue value = resolver.resolve(
				new SecretReference("secret://identity/ldap/bind-password"))) {
			assertThat(value.reveal()).containsExactly("s3cret".toCharArray());
		}
	}

	@Test
	void doesNotExposeTheReferenceWhenASecretIsMissing() {
		EnvironmentSecretResolver resolver = new EnvironmentSecretResolver(Map.of());
		SecretReference reference = new SecretReference("secret://identity/ldap/bind-password");

		assertThatThrownBy(() -> resolver.resolve(reference))
				.isInstanceOf(SecretResolutionException.class)
				.hasMessageNotContaining("identity/ldap");
	}
}
