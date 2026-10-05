package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("identityProviderRegistry")
class ProviderRegistryHealthIndicator implements HealthIndicator {

	private final IdentityProviderRepository providers;

	ProviderRegistryHealthIndicator(IdentityProviderRepository providers) {
		this.providers = providers;
	}

	@Override
	public Health health() {
		long total = providers.findAll().size();
		long enabled = providers.findEnabled().size();
		return Health.up().withDetail("registered", total).withDetail("enabled", enabled).build();
	}
}
