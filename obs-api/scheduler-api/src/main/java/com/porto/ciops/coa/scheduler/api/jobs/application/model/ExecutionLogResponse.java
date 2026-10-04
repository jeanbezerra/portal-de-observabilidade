package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Evento de log persistido durante uma execução de job")
public record ExecutionLogResponse(
		long id,
		String fireInstanceId,
		Instant loggedAt,
		String level,
		String source,
		String message,
		String details) {
}
