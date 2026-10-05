package com.porto.ciops.coa.obs.identityaccess.provider.application;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;

public interface ProviderConfigurationValidator {

	void validateSecretSafety(IdentityProviderDefinition provider);

	void validate(IdentityProviderDefinition provider);
}
