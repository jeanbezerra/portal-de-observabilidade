package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.util.Map;
import java.util.Objects;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;

public record FederatedIdentity(
		String externalSubject,
		ProviderId providerId,
		ProviderType providerType,
		Map<String, Object> attributes) {

	public FederatedIdentity {
		if (externalSubject == null || externalSubject.isBlank()) {
			throw new IllegalArgumentException("externalSubject must not be blank");
		}
		Objects.requireNonNull(providerId, "providerId");
		Objects.requireNonNull(providerType, "providerType");
		attributes = Map.copyOf(attributes);
	}
}
