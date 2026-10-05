package com.porto.ciops.coa.obs.identityaccess.authorization.domain;

import java.util.Set;

@FunctionalInterface
public interface RolePermissionResolver {

	ResolvedEntitlements resolve(String subject, String providerId, Set<String> externalGroups);

	record ResolvedEntitlements(Set<String> roles, Set<String> permissions) {
		public ResolvedEntitlements {
			roles = Set.copyOf(roles);
			permissions = Set.copyOf(permissions);
		}
	}
}
