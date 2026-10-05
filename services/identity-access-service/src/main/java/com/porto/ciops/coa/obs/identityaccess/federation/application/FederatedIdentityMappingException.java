package com.porto.ciops.coa.obs.identityaccess.federation.application;

import java.io.Serial;

public class FederatedIdentityMappingException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public FederatedIdentityMappingException() {
		super("The federated identity does not contain the required mapped attributes");
	}
}
