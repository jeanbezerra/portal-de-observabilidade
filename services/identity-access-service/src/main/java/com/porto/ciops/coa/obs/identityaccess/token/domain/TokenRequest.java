package com.porto.ciops.coa.obs.identityaccess.token.domain;

import java.util.Set;

public record TokenRequest(String subject, String audience, Set<String> roles, Set<String> permissions) {
	public TokenRequest {
		roles = Set.copyOf(roles);
		permissions = Set.copyOf(permissions);
	}
}
