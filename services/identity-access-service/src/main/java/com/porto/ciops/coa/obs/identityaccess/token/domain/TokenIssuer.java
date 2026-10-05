package com.porto.ciops.coa.obs.identityaccess.token.domain;

@FunctionalInterface
public interface TokenIssuer {

	IssuedToken issue(TokenRequest request);
}
