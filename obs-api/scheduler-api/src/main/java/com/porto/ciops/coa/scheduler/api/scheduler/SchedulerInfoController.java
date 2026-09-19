package com.porto.ciops.coa.scheduler.api.scheduler;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SchedulerMetaData;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/v1/scheduler", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Scheduler", description = "Estado operacional da instância do Quartz Scheduler")
public class SchedulerInfoController {

	private final Scheduler scheduler;

	public SchedulerInfoController(Scheduler scheduler) {
		this.scheduler = scheduler;
	}

	@GetMapping
	@Operation(summary = "Consultar o estado do scheduler")
	@ApiResponse(responseCode = "200", description = "Estado atual consultado com sucesso")
	@ApiResponse(responseCode = "503", description = "Scheduler temporariamente indisponível")
	public SchedulerInfoResponse getSchedulerInfo() throws SchedulerException {
		SchedulerMetaData metadata = scheduler.getMetaData();

		return new SchedulerInfoResponse(
				scheduler.getSchedulerName(),
				scheduler.getSchedulerInstanceId(),
				metadata.getVersion(),
				resolveState(),
				metadata.isJobStoreClustered(),
				metadata.getThreadPoolSize(),
				metadata.getNumberOfJobsExecuted(),
				metadata.getRunningSince().toInstant());
	}

	private String resolveState() throws SchedulerException {
		if (scheduler.isShutdown()) {
			return "SHUTDOWN";
		}
		if (scheduler.isInStandbyMode()) {
			return "STANDBY";
		}
		if (scheduler.isStarted()) {
			return "RUNNING";
		}
		return "STARTING";
	}
}
