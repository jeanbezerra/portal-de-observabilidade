package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import java.time.Instant;

public record ExecutionHistoryResponse(
		long id,
		String fireInstanceId,
		String jobName,
		String jobGroup,
		String triggerName,
		String triggerGroup,
		String schedulerInstance,
		Instant scheduledFireTime,
		Instant actualFireTime,
		Instant finishedAt,
		Long durationMillis,
		String result,
		String message,
		int refireCount,
		boolean recovering,
		boolean interruptionRequested) {
}
