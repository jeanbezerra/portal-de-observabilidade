package com.porto.ciops.coa.scheduler.api.administration.application.model;

import java.time.Instant;

public record TimeZoneResponse(
		String id,
		String label,
		String timeZone,
		String description,
		boolean active,
		boolean isDefault,
		Instant createdAt,
		Instant updatedAt) {
}
