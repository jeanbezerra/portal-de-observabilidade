package com.porto.ciops.coa.obs.identityaccess.token.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;

class TokenContractsTest {

	@Test
	void copiesEntitlementsAndRedactsTheTokenValue() {
		Set<String> roles = new LinkedHashSet<>(Set.of("operator"));
		Set<String> permissions = new LinkedHashSet<>(Set.of("job:read"));
		TokenRequest request = new TokenRequest("subject-1", "portal", roles, permissions);
		roles.clear();
		permissions.clear();
		IssuedToken issued = new IssuedToken("signed-secret-token", Instant.EPOCH.plusSeconds(300));

		assertThat(request.roles()).containsExactly("operator");
		assertThat(request.permissions()).containsExactly("job:read");
		assertThat(issued.toString()).contains("[REDACTED]").doesNotContain("signed-secret-token");
	}
}
