package com.porto.ciops.coa.obs.identityaccess.federation.application;

import java.io.Serial;

public class AuthenticationFailedException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public AuthenticationFailedException() {
		super("Authentication failed");
	}
}
