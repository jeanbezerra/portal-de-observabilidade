package com.porto.ciops.coa.obs.identityaccess.authorization.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationDecision;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationRequest;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.Permission;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import org.junit.jupiter.api.Test;

class DefaultAuthorizationServiceTest {

	private final List<AuditEvent> events = new ArrayList<>();
	private final Clock clock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void grantsAnExactPermission() {
		DefaultAuthorizationService service = service(Set.of("job:read"));

		AuthorizationDecision decision = service.authorize(request("job:read"));

		assertThat(decision.allowed()).isTrue();
		assertThat(events).singleElement().extracting(AuditEvent::outcome).isEqualTo("SUCCESS");
	}

	@Test
	void deniesByDefaultWhenPermissionIsAbsent() {
		DefaultAuthorizationService service = service(Set.of());

		AuthorizationDecision decision = service.authorize(request("job:write"));

		assertThat(decision.allowed()).isFalse();
		assertThat(decision.reason()).isEqualTo("permission-not-granted");
		assertThat(events).singleElement().extracting(AuditEvent::outcome).isEqualTo("DENIED");
	}

	private DefaultAuthorizationService service(Set<String> permissions) {
		RolePermissionResolver resolver = (subject, provider, groups) ->
				new RolePermissionResolver.ResolvedEntitlements(Set.of("OPS"), permissions);
		return new DefaultAuthorizationService(resolver, events::add, () -> "trace-123", clock);
	}

	private static AuthorizationRequest request(String permission) {
		return new AuthorizationRequest("subject-1", "corporate-oidc", Permission.parse(permission),
				Set.of("ops"), Map.of());
	}
}
