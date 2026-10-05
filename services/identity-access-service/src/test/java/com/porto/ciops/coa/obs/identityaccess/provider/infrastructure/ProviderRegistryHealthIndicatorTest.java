package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;
import org.springframework.boot.health.contributor.Status;

class ProviderRegistryHealthIndicatorTest {

	@Test
	void reportsRegisteredAndEnabledProviderCounts() {
		IdentityProviderRepository providers = mock(IdentityProviderRepository.class);
		IdentityProviderDefinition enabled = provider("enabled-oidc");
		IdentityProviderDefinition draft = provider("draft-oidc");
		enabled.markValidated(Instant.EPOCH.plusSeconds(1));
		enabled.enable(Instant.EPOCH.plusSeconds(2));
		when(providers.findAll()).thenReturn(List.of(enabled, draft));
		when(providers.findEnabled()).thenReturn(List.of(enabled));

		var health = new ProviderRegistryHealthIndicator(providers).health();

		assertThat(health.getStatus()).isEqualTo(Status.UP);
		assertThat(health.getDetails()).containsEntry("registered", 2L).containsEntry("enabled", 1L);
	}

	private static IdentityProviderDefinition provider(String id) {
		return IdentityProviderDefinition.draft(new ProviderId(id), id, ProviderType.OIDC, 0, Map.of(), Map.of(),
				Instant.EPOCH);
	}
}
