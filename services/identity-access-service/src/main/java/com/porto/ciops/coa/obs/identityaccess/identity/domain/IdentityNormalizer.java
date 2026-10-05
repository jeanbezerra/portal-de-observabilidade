package com.porto.ciops.coa.obs.identityaccess.identity.domain;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;

@FunctionalInterface
public interface IdentityNormalizer {

	PlatformIdentity normalize(FederatedIdentity federatedIdentity);
}
