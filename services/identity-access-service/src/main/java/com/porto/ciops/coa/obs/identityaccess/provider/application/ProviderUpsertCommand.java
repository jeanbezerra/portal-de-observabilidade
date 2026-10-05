package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;

public record ProviderUpsertCommand(
		String id,
		String displayName,
		ProviderType type,
		int priority,
		Map<String, String> configuration,
		Map<String, String> attributeMappings) {

	public ProviderUpsertCommand {
		configuration = Map.copyOf(configuration);
		attributeMappings = Map.copyOf(attributeMappings);
	}
}
