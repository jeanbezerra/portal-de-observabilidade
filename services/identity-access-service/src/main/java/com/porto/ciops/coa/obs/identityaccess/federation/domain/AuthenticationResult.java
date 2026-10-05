package com.porto.ciops.coa.obs.identityaccess.federation.domain;

public record AuthenticationResult(boolean authenticated, FederatedIdentity identity, String failureCode) {
	public AuthenticationResult {
		if (authenticated == (identity == null)) {
			throw new IllegalArgumentException("Successful results require an identity and failed results must not contain one");
		}
	}

	public static AuthenticationResult success(FederatedIdentity identity) {
		return new AuthenticationResult(true, identity, null);
	}

	public static AuthenticationResult failure(String failureCode) {
		return new AuthenticationResult(false, null, failureCode);
	}
}
