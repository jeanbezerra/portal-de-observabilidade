package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.io.Serial;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;

public class ProviderAlreadyExistsException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public ProviderAlreadyExistsException(ProviderId providerId) {
		super("Identity provider %s already exists".formatted(providerId));
	}
}
