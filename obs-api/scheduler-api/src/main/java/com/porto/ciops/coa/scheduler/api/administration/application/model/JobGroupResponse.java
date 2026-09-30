package com.porto.ciops.coa.scheduler.api.administration.application.model;

import java.time.Instant;

public record JobGroupResponse(
		String id,
		String key,
		String name,
		String description,
		boolean active,
		long routineCount,
		Instant createdAt,
		Instant updatedAt) {
}
