package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Execução disponível para filtragem dos logs de uma rotina")
public record ExecutionLogExecutionResponse(
		String fireInstanceId,
		Instant actualFireTime,
		String result,
		long logCount) {
}
