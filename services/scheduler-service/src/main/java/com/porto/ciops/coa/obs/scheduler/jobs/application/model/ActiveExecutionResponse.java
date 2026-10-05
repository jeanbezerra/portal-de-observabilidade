package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import java.time.Instant;

public record ActiveExecutionResponse(
		String state,
		String fireInstanceId,
		String schedulerInstance,
		String podName,
		Instant scheduledFireTime,
		Instant actualFireTime,
		long elapsedMillis,
		int refireCount,
		boolean recovering) {
}
