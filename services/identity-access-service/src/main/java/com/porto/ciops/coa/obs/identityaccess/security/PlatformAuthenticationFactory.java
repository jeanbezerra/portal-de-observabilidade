package com.porto.ciops.coa.obs.identityaccess.security;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public final class PlatformAuthenticationFactory {

	private PlatformAuthenticationFactory() {
	}

	public static UsernamePasswordAuthenticationToken authenticated(PlatformIdentity identity) {
		Set<GrantedAuthority> authorities = new LinkedHashSet<>();
		identity.permissions().stream().sorted().map(SimpleGrantedAuthority::new).forEach(authorities::add);
		identity.roles().stream().sorted().map(role -> new SimpleGrantedAuthority("ROLE_" + role))
				.forEach(authorities::add);
		return UsernamePasswordAuthenticationToken.authenticated(PlatformPrincipal.from(identity), null,
				List.copyOf(authorities));
	}
}
