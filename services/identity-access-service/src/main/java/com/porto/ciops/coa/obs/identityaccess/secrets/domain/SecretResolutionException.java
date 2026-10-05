package com.porto.ciops.coa.obs.identityaccess.secrets.domain;

import java.io.Serial;

public class SecretResolutionException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public SecretResolutionException(String message) {
		super(message);
	}
}
