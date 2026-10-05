package com.porto.ciops.coa.obs.identityaccess.federation.application;

import java.io.Serial;

public class ProviderNotAvailableForLoginException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public ProviderNotAvailableForLoginException() {
		super("The selected identity provider is not available for credential authentication");
	}
}
