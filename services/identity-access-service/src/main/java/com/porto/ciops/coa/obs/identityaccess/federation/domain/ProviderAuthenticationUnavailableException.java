package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.io.Serial;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;

public class ProviderAuthenticationUnavailableException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;
	private final String providerId;

	public ProviderAuthenticationUnavailableException(ProviderId providerId, Throwable cause) {
		super("The identity provider is temporarily unavailable", cause);
		this.providerId = providerId.value();
	}

	public String providerId() {
		return providerId;
	}
}
