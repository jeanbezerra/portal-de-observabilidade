package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import java.io.Serial;

public class InvalidProviderTransitionException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public InvalidProviderTransitionException(ProviderId providerId, ProviderStatus status, String operation) {
		super("Provider %s in status %s cannot perform operation %s".formatted(providerId, status, operation));
	}
}
