package com.porto.ciops.coa.obs.scheduler.scheduler.application;

import java.time.Instant;

public record SchedulerInfo(
		String schedulerName,
		String instanceId,
		String version,
		String state,
		boolean clustered,
		int threadPoolSize,
		int jobsExecuted,
		Instant runningSince) {
}
