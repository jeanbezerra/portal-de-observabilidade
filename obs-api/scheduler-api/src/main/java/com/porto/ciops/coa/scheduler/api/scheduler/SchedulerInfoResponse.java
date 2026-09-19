package com.porto.ciops.coa.scheduler.api.scheduler;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Metadados operacionais da instância local do Quartz Scheduler")
public record SchedulerInfoResponse(
		@Schema(description = "Nome compartilhado pelo cluster", example = "obs-scheduler")
		String schedulerName,
		@Schema(description = "Identificador único da instância", example = "scheduler-api-7d8f9c")
		String instanceId,
		@Schema(description = "Versão do Quartz", example = "2.5.2")
		String version,
		@Schema(description = "Estado da instância", allowableValues = {"STARTING", "RUNNING", "STANDBY", "SHUTDOWN"})
		String state,
		@Schema(description = "Indica se o armazenamento está configurado em cluster")
		boolean clustered,
		@Schema(description = "Quantidade máxima de execuções simultâneas nesta instância", example = "10")
		int threadPoolSize,
		@Schema(description = "Execuções concluídas por esta instância desde a inicialização", example = "42")
		int jobsExecuted,
		@Schema(description = "Instante em que a instância foi iniciada")
		Instant runningSince) {
}
