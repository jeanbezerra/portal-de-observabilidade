package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import java.util.List;
import java.util.Optional;

public interface IdentityProviderRegistry {

	Optional<IdentityProviderDefinition> findById(ProviderId providerId);

	List<IdentityProviderDefinition> findEnabled();

	List<IdentityProviderDefinition> findByType(ProviderType type);
}
