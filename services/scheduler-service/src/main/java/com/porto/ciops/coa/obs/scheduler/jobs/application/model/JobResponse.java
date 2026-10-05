package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import java.util.List;

public record JobResponse(
		String id,
		String name,
		String group,
		String description,
		String type,
		HttpRequestConfiguration httpRequest,
		boolean durable,
		boolean requestsRecovery,
		boolean disallowConcurrent,
		boolean persistJobData,
		boolean interruptable,
		List<TriggerResponse> triggers,
		ActiveExecutionResponse activeExecution,
		ExecutionCountsResponse executionCounts,
		ExecutionSummaryResponse lastExecution) {
}
