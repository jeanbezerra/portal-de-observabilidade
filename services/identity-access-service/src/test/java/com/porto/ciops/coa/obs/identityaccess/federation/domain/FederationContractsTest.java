package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

class FederationContractsTest {

	@Test
	void preservesContextAndCopiesCallbackParameters() {
		AuthenticationContext context = new AuthenticationContext(URI.create("https://portal.example/return"),
				"correlation-123");
		Map<String, String> parameters = new LinkedHashMap<>(Map.of("code", "authorization-code"));
		AuthenticationCallback callback = new AuthenticationCallback(parameters);
		parameters.clear();

		assertThat(context.returnUri().getHost()).isEqualTo("portal.example");
		assertThat(callback.parameters()).containsEntry("code", "authorization-code");
	}
}
