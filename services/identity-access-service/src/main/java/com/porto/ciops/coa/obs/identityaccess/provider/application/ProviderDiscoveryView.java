package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.io.Serializable;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderInteraction;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;

public record ProviderDiscoveryView(String id, String displayName, ProviderType type,
		ProviderInteraction interaction) implements Serializable {

	public static ProviderDiscoveryView from(IdentityProviderDefinition provider) {
		return new ProviderDiscoveryView(provider.id().value(), provider.displayName(), provider.type(),
				provider.interaction());
	}
}
