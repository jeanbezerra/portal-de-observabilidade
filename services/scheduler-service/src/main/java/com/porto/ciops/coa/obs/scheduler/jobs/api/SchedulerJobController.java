package com.porto.ciops.coa.obs.scheduler.jobs.api;

import com.porto.ciops.coa.obs.scheduler.jobs.application.SchedulerBulkJobActionService;
import com.porto.ciops.coa.obs.scheduler.jobs.application.SchedulerJobService;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobActionRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobActionResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionHistoryResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogPageResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogSearchCriteria;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobTypeConfigurationRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.quartz.SchedulerException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Rotinas agendadas", description = "Administração de JobDetails, triggers e execuções do Quartz")
public class SchedulerJobController {

	private final SchedulerJobService service;
	private final SchedulerBulkJobActionService bulkActions;

	/**
	 * Creates the HTTP adapter for single-job and bulk scheduler operations.
	 *
	 * @param service application service for individual job operations
	 * @param bulkActions application service for resilient bulk actions
	 */
	public SchedulerJobController(SchedulerJobService service, SchedulerBulkJobActionService bulkActions) {
		this.service = service;
		this.bulkActions = bulkActions;
	}

	@GetMapping("/jobs")
	@Operation(summary = "Listar rotinas e seu estado operacional")
	List<JobResponse> listJobs() throws SchedulerException {
		return service.listJobs();
	}

	@GetMapping("/jobs/{group}/{name}")
	@Operation(summary = "Consultar uma rotina")
	JobResponse getJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.getJob(group, name);
	}

	@PostMapping("/jobs")
	@Operation(summary = "Criar uma rotina e seus triggers iniciais")
	ResponseEntity<JobResponse> createJob(@Valid @RequestBody JobRequest request) throws SchedulerException {
		JobResponse created = service.createJob(request);
		return ResponseEntity.created(URI.create("/api/v1/jobs/" + created.group() + "/" + created.name())).body(created);
	}

	@PutMapping("/jobs/{jobGroup}/{jobName}/triggers/{triggerGroup}/{triggerName}")
	@Operation(summary = "Substituir o agendamento de um trigger")
	TriggerResponse updateTrigger(
			@PathVariable String jobGroup,
			@PathVariable String jobName,
			@PathVariable String triggerGroup,
			@PathVariable String triggerName,
			@Valid @RequestBody TriggerRequest request) throws SchedulerException {
		return service.updateTrigger(jobGroup, jobName, triggerGroup, triggerName, request);
	}

	@PutMapping("/jobs/{group}/{name}/configuration")
	@Operation(summary = "Atualizar a configuração do tipo do job")
	JobResponse updateJobTypeConfiguration(
			@PathVariable String group,
			@PathVariable String name,
			@Valid @RequestBody JobTypeConfigurationRequest request) throws SchedulerException {
		return service.updateJobTypeConfiguration(group, name, request);
	}

	@PostMapping("/jobs/{group}/{name}/pause")
	@Operation(summary = "Pausar os próximos disparos de uma rotina")
	JobResponse pauseJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.pauseJob(group, name);
	}

	@PostMapping("/jobs/{group}/{name}/resume")
	@Operation(summary = "Retomar os disparos de uma rotina")
	JobResponse resumeJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.resumeJob(group, name);
	}

	@PostMapping("/jobs/{group}/{name}/trigger")
	@Operation(summary = "Solicitar uma execução imediata")
	JobResponse triggerJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.triggerJob(group, name);
	}

	@PostMapping("/jobs/{group}/{name}/interrupt")
	@Operation(summary = "Solicitar a interrupção de uma execução ativa")
	JobResponse interruptJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.interruptJob(group, name);
	}

	@PostMapping("/jobs/{group}/{name}/duplicate")
	@Operation(summary = "Duplicar uma rotina e manter a cópia pausada")
	JobResponse duplicateJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		return service.duplicateJob(group, name);
	}

	@DeleteMapping("/jobs/{group}/{name}")
	@Operation(summary = "Excluir uma rotina e seus triggers")
	ResponseEntity<Void> deleteJob(@PathVariable String group, @PathVariable String name) throws SchedulerException {
		service.deleteJob(group, name);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/jobs/actions/{action}")
	@Operation(summary = "Executar uma ação em lote")
	BulkJobActionResponse bulkAction(@PathVariable String action, @Valid @RequestBody BulkJobActionRequest request) {
		return bulkActions.execute(request.jobs(), action);
	}

	@GetMapping("/executions")
	@Operation(summary = "Consultar o histórico de execuções")
	List<ExecutionHistoryResponse> listExecutions(@RequestParam(defaultValue = "200") int limit) {
		return service.listExecutions(limit);
	}

	@GetMapping("/jobs/{group}/{name}/logs")
	@Operation(summary = "Consultar os logs das execuções de uma rotina")
	List<ExecutionLogResponse> listExecutionLogs(
			@PathVariable String group,
			@PathVariable String name,
			@RequestParam(defaultValue = "500") int limit) {
		return service.listExecutionLogs(group, name, limit);
	}

	@GetMapping("/jobs/{group}/{name}/logs/search")
	@Operation(summary = "Pesquisar os logs paginados das execuções de uma rotina")
	ExecutionLogPageResponse searchExecutionLogs(
			@PathVariable String group,
			@PathVariable String name,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "25") int pageSize,
			@RequestParam(defaultValue = "loggedAt") String sort,
			@RequestParam(defaultValue = "desc") String direction,
			@RequestParam(defaultValue = "ALL") String level,
			@RequestParam(defaultValue = "") String fireInstanceId,
			@RequestParam(defaultValue = "") String query) {
		return service.searchExecutionLogs(group, name,
				new ExecutionLogSearchCriteria(page, pageSize, sort, direction, level, fireInstanceId, query));
	}
}
