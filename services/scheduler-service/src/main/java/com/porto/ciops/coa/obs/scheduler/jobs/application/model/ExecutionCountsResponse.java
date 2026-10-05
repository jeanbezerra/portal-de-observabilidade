package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Totais de execuções concluídas de uma rotina por resultado")
public record ExecutionCountsResponse(
		long successCount,
		long failureCount) {
}
