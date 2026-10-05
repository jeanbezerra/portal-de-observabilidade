package com.porto.ciops.coa.obs.identityaccess.authorization.domain;

import java.util.Set;

public record AuthorizationDecision(boolean allowed, String reason, Set<String> roles,
		Set<String> effectivePermissions) {
	public AuthorizationDecision {
		roles = Set.copyOf(roles);
		effectivePermissions = Set.copyOf(effectivePermissions);
	}
}
