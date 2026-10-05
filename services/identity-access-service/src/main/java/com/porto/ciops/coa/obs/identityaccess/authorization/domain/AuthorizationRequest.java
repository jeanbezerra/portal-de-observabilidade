package com.porto.ciops.coa.obs.identityaccess.authorization.domain;

import java.util.Map;
import java.util.Set;

public record AuthorizationRequest(String subject, String providerId, Permission permission, Set<String> groups,
		Map<String, Object> attributes) {
	public AuthorizationRequest {
		groups = Set.copyOf(groups);
		attributes = Map.copyOf(attributes);
	}
}
