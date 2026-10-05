package com.porto.ciops.coa.obs.identityaccess.identity.domain;

import java.util.Map;
import java.util.Set;

public record PlatformIdentity(
		String subject,
		String username,
		String email,
		String displayName,
		String providerId,
		Set<String> groups,
		Set<String> roles,
		Set<String> permissions,
		Map<String, Object> attributes) {

	public PlatformIdentity {
		groups = Set.copyOf(groups);
		roles = Set.copyOf(roles);
		permissions = Set.copyOf(permissions);
		attributes = Map.copyOf(attributes);
	}
}
