package com.porto.ciops.coa.obs.scheduler.administration.application.model;

import java.time.Instant;
import java.time.LocalDate;

public record CalendarEntryResponse(
		String id,
		String name,
		LocalDate date,
		String type,
		String scope,
		String location,
		String notes,
		Instant createdAt,
		Instant updatedAt) {
}
