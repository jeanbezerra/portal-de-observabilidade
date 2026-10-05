package com.porto.ciops.coa.obs.identityaccess.audit.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record AuditEvent(
		UUID id,
		Instant occurredAt,
		String eventType,
		String actorSubject,
		String target,
		String providerId,
		String outcome,
		String traceId,
		String sourceContext) {

	public AuditEvent {
		Objects.requireNonNull(id, "id");
		Objects.requireNonNull(occurredAt, "occurredAt");
		requireText(eventType, "eventType");
		requireText(actorSubject, "actorSubject");
		requireText(target, "target");
		requireText(outcome, "outcome");
	}

	public static AuditEvent success(Instant now, String eventType, String actor, String target,
			String providerId, String traceId) {
		return new AuditEvent(UUID.randomUUID(), now, eventType, actor, target, providerId,
				"SUCCESS", traceId, null);
	}

	public static AuditEvent denied(Instant now, String eventType, String actor, String target,
			String traceId) {
		return new AuditEvent(UUID.randomUUID(), now, eventType, actor, target, null,
				"DENIED", traceId, null);
	}

	public static AuditEvent failure(Instant now, String eventType, String actor, String target,
			String providerId, String traceId, String sourceContext) {
		return new AuditEvent(UUID.randomUUID(), now, eventType, actor, target, providerId,
				"FAILURE", traceId, sourceContext);
	}

	private static void requireText(String value, String field) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(field + " must not be blank");
		}
	}
}
