package com.porto.ciops.coa.obs.identityaccess.provider.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class ProviderResponseTest {

	@Test
	void redactsSecretReferencesFromAdministrativeResponses() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"),
				"Corporate OIDC", ProviderType.OIDC, 0, Map.of(
						"issuer-uri", "https://login.example/tenant",
						"client-secret-reference", "secret://identity/oidc/client-secret"),
				Map.of("subject", "sub", "username", "preferred_username"), Instant.EPOCH);

		ProviderResponse response = ProviderResponse.from(provider);

		assertThat(response.configuration())
				.containsEntry("issuer-uri", "https://login.example/tenant")
				.containsEntry("client-secret-reference", "[REDACTED]")
				.doesNotContainValue("secret://identity/oidc/client-secret");
	}
}
