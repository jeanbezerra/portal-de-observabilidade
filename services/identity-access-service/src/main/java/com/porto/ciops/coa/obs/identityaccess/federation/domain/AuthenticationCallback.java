package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.util.Map;

public record AuthenticationCallback(Map<String, String> parameters) {
	public AuthenticationCallback {
		parameters = Map.copyOf(parameters);
	}
}
