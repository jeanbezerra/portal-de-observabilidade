package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import java.time.Instant;

public record ExecutionSummaryResponse(
		String result,
		Instant finishedAt,
		long durationMillis,
		String message) {
}
