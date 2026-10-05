package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Página filtrada e ordenada dos logs de execução de uma rotina")
public record ExecutionLogPageResponse(
		List<ExecutionLogResponse> items,
		int page,
		int pageSize,
		long totalItems,
		int totalPages,
		long infoCount,
		long warningCount,
		long errorCount,
		List<ExecutionLogExecutionResponse> executions) {

	public ExecutionLogPageResponse {
		items = List.copyOf(items);
		executions = List.copyOf(executions);
	}
}
