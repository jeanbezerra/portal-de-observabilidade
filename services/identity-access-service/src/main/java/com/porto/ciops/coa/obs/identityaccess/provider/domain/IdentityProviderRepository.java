package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import java.util.List;

public interface IdentityProviderRepository extends IdentityProviderRegistry {

	IdentityProviderDefinition save(IdentityProviderDefinition provider);

	boolean existsById(ProviderId providerId);

	List<IdentityProviderDefinition> findAll();
}
