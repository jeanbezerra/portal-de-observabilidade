package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "audit_event")
class AuditEventEntity {

	@Id
	private UUID id;
	@Column(name = "occurred_at", nullable = false)
	private Instant occurredAt;
	@Column(name = "event_type", nullable = false, length = 100)
	private String eventType;
	@Column(name = "actor_subject", nullable = false)
	private String actorSubject;
	@Column(nullable = false)
	private String target;
	@Column(name = "provider_id", length = 63)
	private String providerId;
	@Column(nullable = false, length = 20)
	private String outcome;
	@Column(name = "trace_id", length = 64)
	private String traceId;
	@Column(name = "source_context")
	private String sourceContext;

	protected AuditEventEntity() {
		// Required by JPA.
	}

	static AuditEventEntity from(AuditEvent event) {
		AuditEventEntity entity = new AuditEventEntity();
		entity.id = event.id();
		entity.occurredAt = event.occurredAt();
		entity.eventType = event.eventType();
		entity.actorSubject = event.actorSubject();
		entity.target = event.target();
		entity.providerId = event.providerId();
		entity.outcome = event.outcome();
		entity.traceId = event.traceId();
		entity.sourceContext = event.sourceContext();
		return entity;
	}
}
