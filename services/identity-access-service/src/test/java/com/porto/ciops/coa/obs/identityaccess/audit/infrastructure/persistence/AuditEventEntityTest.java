package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import org.junit.jupiter.api.Test;

class AuditEventEntityTest {

	@Test
	void mapsAnAuditEventForPersistence() {
		AuditEvent event = AuditEvent.failure(Instant.EPOCH, "authentication.failed", "subject-1",
				"browser-session", "corporate-oidc", "trace-123", "invalid-credentials");

		assertThat(AuditEventEntity.from(event)).isNotNull();
	}
}
