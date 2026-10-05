package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.util.List;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.micrometer.observation.annotation.Observed;

@Service
@Transactional(readOnly = true)
public class ProviderQueryService {

	private final IdentityProviderRepository providers;

	public ProviderQueryService(IdentityProviderRepository providers) {
		this.providers = providers;
	}

	public List<IdentityProviderDefinition> findAll() {
		return providers.findAll();
	}

	public IdentityProviderDefinition findById(String providerId) {
		ProviderId id = new ProviderId(providerId);
		return providers.findById(id).orElseThrow(() -> new ProviderNotFoundException(id));
	}

	@Cacheable(cacheNames = "provider-discovery", key = "'enabled'")
	@Observed(name = "identity.provider.resolve")
	public List<ProviderDiscoveryView> discoverEnabled() {
		return providers.findEnabled().stream().map(ProviderDiscoveryView::from).toList();
	}
}
