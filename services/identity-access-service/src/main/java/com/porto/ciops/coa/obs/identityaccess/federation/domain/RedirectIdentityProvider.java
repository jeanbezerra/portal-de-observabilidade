package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProvider;

public interface RedirectIdentityProvider extends IdentityProvider {

	AuthenticationRedirect beginAuthentication(AuthenticationContext context);

	AuthenticationResult completeAuthentication(AuthenticationCallback callback);
}
