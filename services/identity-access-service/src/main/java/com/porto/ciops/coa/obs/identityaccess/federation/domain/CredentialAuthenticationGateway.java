package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;

@FunctionalInterface
public interface CredentialAuthenticationGateway {

	AuthenticationResult authenticate(IdentityProviderDefinition provider, CredentialAuthenticationRequest request);
}
