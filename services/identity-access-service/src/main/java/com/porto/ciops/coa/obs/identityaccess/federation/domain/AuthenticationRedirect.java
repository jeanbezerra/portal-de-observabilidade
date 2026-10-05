package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.net.URI;
import java.util.Map;

public record AuthenticationRedirect(URI location, Map<String, String> state) {
	public AuthenticationRedirect {
		state = Map.copyOf(state);
	}
}
