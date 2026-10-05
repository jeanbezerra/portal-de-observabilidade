package com.porto.ciops.coa.obs.identityaccess.authorization.domain;

@FunctionalInterface
public interface AuthorizationService {

	AuthorizationDecision authorize(AuthorizationRequest request);
}
