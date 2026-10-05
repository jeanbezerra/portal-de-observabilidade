package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProvider;

public interface CredentialIdentityProvider extends IdentityProvider {

	AuthenticationResult authenticate(CredentialAuthenticationRequest request);
}
