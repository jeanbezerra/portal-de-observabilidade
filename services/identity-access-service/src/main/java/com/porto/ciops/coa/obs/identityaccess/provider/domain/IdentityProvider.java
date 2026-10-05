package com.porto.ciops.coa.obs.identityaccess.provider.domain;

public interface IdentityProvider {

	ProviderId id();

	ProviderType type();

	ProviderStatus status();
}
