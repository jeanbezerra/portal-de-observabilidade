package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;

class IdentityProviderDefinitionTest {

	private static final Instant NOW = Instant.parse("2026-01-01T00:00:00Z");

	@Test
	void followsTheValidatedEnabledDisabledLifecycle() {
		IdentityProviderDefinition provider = provider();

		provider.markValidated(NOW.plusSeconds(1));
		provider.enable(NOW.plusSeconds(2));
		provider.disable(NOW.plusSeconds(3));

		assertThat(provider.status()).isEqualTo(ProviderStatus.DISABLED);
		assertThat(provider.updatedAt()).isEqualTo(NOW.plusSeconds(3));
	}

	@Test
	void rejectsEnablingAnUnvalidatedProvider() {
		IdentityProviderDefinition provider = provider();
		Instant transitionTime = NOW.plusSeconds(1);

		assertThatThrownBy(() -> provider.enable(transitionTime))
				.isInstanceOf(InvalidProviderTransitionException.class)
				.hasMessageContaining("DRAFT");
	}

	@Test
	void rejectsChangesWhileProviderIsEnabled() {
		IdentityProviderDefinition provider = provider();
		provider.markValidated(NOW.plusSeconds(1));
		provider.enable(NOW.plusSeconds(2));
		Instant revisionTime = NOW.plusSeconds(3);
		Map<String, String> emptyConfiguration = Map.of();

		assertThatThrownBy(() -> revise(provider, emptyConfiguration, revisionTime))
				.isInstanceOf(InvalidProviderTransitionException.class);
	}

	@Test
	void revisesAndRecoversAProviderInError() {
		IdentityProviderDefinition provider = provider();
		IdentityProviderDefinition revised = provider.revise("Updated", 20, Map.of("issuer", "https://login.example"),
				Map.of("subject", "sub", "username", "email"), NOW.plusSeconds(1));
		revised.markError(NOW.plusSeconds(2));
		revised.markValidated(NOW.plusSeconds(3));

		assertThat(revised.displayName()).isEqualTo("Updated");
		assertThat(revised.priority()).isEqualTo(20);
		assertThat(revised.status()).isEqualTo(ProviderStatus.VALIDATED);
		assertThat(revised.createdAt()).isEqualTo(NOW);
	}

	@Test
	void rejectsInvalidAggregateStateAndTransitions() {
		ProviderId providerId = new ProviderId("corporate-oidc");
		Map<String, String> empty = Map.of();
		assertThatThrownBy(() -> IdentityProviderDefinition.draft(providerId, " ", ProviderType.OIDC, 0,
				empty, empty, NOW)).isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> IdentityProviderDefinition.draft(providerId, "OIDC", ProviderType.OIDC, -1,
				empty, empty, NOW)).isInstanceOf(IllegalArgumentException.class);
		IdentityProviderDefinition provider = provider();
		assertThatThrownBy(() -> provider.disable(NOW)).isInstanceOf(InvalidProviderTransitionException.class);
	}

	private static IdentityProviderDefinition provider() {
		return IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"), "Corporate OIDC",
				ProviderType.OIDC, 10, Map.of(), Map.of("subject", "sub", "username", "preferred_username"), NOW);
	}

	private static void revise(IdentityProviderDefinition provider, Map<String, String> configuration,
			Instant revisionTime) {
		IdentityProviderDefinition revised = provider.revise("Changed", 1, configuration, configuration, revisionTime);
		assertThat(revised).isNotNull();
	}
}
