package com.porto.ciops.coa.obs.identityaccess.security;

import java.io.Serializable;
import java.util.Map;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import org.springframework.security.core.AuthenticatedPrincipal;

public record PlatformPrincipal(String subject, String username, String email, String displayName,
		String providerId, Set<String> roles, Set<String> permissions,
		Map<String, Object> attributes) implements AuthenticatedPrincipal, Serializable {

	public PlatformPrincipal {
		roles = Set.copyOf(roles);
		permissions = Set.copyOf(permissions);
		attributes = Map.copyOf(attributes);
	}

	public static PlatformPrincipal from(PlatformIdentity identity) {
		return new PlatformPrincipal(identity.subject(), identity.username(), identity.email(),
				identity.displayName(), identity.providerId(), identity.roles(), identity.permissions(),
				identity.attributes());
	}

	@Override
	public String getName() {
		return subject;
	}
}
