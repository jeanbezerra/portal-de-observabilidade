package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;

@FunctionalInterface
public interface RedirectAuthenticationGateway {

	AuthenticationRedirect begin(IdentityProviderDefinition provider);
}
