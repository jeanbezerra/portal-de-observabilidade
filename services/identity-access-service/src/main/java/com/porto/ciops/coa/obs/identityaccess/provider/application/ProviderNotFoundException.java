package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.io.Serial;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;

public class ProviderNotFoundException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public ProviderNotFoundException(ProviderId providerId) {
		super("Identity provider %s was not found".formatted(providerId));
	}
}
