package com.porto.ciops.coa.scheduler.api.scheduler.api;

import com.porto.ciops.coa.scheduler.api.scheduler.application.SchedulerInfoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.quartz.SchedulerException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/api/v1/scheduler", produces = MediaType.APPLICATION_JSON_VALUE)
@Tag(name = "Scheduler", description = "Estado operacional da instância do Quartz Scheduler")
public class SchedulerInfoController {

	private final SchedulerInfoService service;

	public SchedulerInfoController(SchedulerInfoService service) {
		this.service = service;
	}

	@GetMapping
	@Operation(summary = "Consultar o estado do scheduler")
	@ApiResponse(responseCode = "200", description = "Estado atual consultado com sucesso")
	@ApiResponse(responseCode = "503", description = "Scheduler temporariamente indisponível")
	public SchedulerInfoResponse getSchedulerInfo() throws SchedulerException {
		return SchedulerInfoResponse.from(service.getSchedulerInfo());
	}
}
