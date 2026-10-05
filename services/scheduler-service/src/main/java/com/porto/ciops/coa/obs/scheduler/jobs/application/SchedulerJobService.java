package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.administration.application.AdministrationCatalogService;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionHistoryResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogPageResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobTypeConfigurationRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerRequest;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.quartz.HttpRequestJob;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import jakarta.validation.Valid;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.quartz.JobBuilder;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.ObjectAlreadyExistsException;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class SchedulerJobService {

	private final Scheduler scheduler;
	private final JdbcTemplate jdbc;
	private final AdministrationCatalogService catalogs;
	private final SchedulerJobQueryService queries;
	private final SchedulerTriggerFactory triggerFactory;
	private final HttpRequestConfigurationValidator httpValidator;
	private final ObjectMapper objectMapper;

	public SchedulerJobService(Scheduler scheduler, JdbcTemplate jdbc, AdministrationCatalogService catalogs,
			SchedulerJobQueryService queries, SchedulerTriggerFactory triggerFactory,
			HttpRequestConfigurationValidator httpValidator, ObjectMapper objectMapper) {
		this.scheduler = scheduler;
		this.jdbc = jdbc;
		this.catalogs = catalogs;
		this.queries = queries;
		this.triggerFactory = triggerFactory;
		this.httpValidator = httpValidator;
		this.objectMapper = objectMapper;
	}

	public List<JobResponse> listJobs() throws SchedulerException {
		return queries.listJobs();
	}

	public JobResponse getJob(String group, String name) throws SchedulerException {
		return queries.getJob(group, name);
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public JobResponse createJob(@Valid JobRequest request) throws SchedulerException {
		return createJobInternal(request);
	}

	private JobResponse createJobInternal(JobRequest request) throws SchedulerException {
		validateNewJob(request);
		JobKey key = JobKey.jobKey(request.name(), request.group());
		ensureJobKeyAvailable(key);
		JobDetail detail = buildJobDetail(key, request);
		Set<Trigger> triggers = buildTriggers(key, request.triggers());
		persistNewJob(key, detail, triggers, request);
		return getJob(request.group(), request.name());
	}

	private void validateNewJob(JobRequest request) {
		if (!catalogs.activeJobGroupExists(request.group())) {
			throw ApplicationProblemException.conflict("Grupo indisponível",
					"Selecione um grupo de rotinas ativo e cadastrado.");
		}
		if (request.triggers().isEmpty() && !request.durable()) {
			throw ApplicationProblemException.invalidInput("Rotina não durável sem trigger",
					"Uma rotina sem trigger inicial precisa ser durável.");
		}
		validateRequestCollections(request);
		httpValidator.validate(request.httpRequest());
	}

	private void ensureJobKeyAvailable(JobKey key) throws SchedulerException {
		if (scheduler.checkExists(key)) {
			throw ApplicationProblemException.conflict("Rotina duplicada",
					"Já existe uma rotina com este nome e grupo.");
		}
	}

	private static JobDetail buildJobDetail(JobKey key, JobRequest request) {
		JobDataMap dataMap = new JobDataMap();
		dataMap.put("_jobType", request.type());
		return JobBuilder.newJob(HttpRequestJob.class)
				.withIdentity(key)
				.withDescription(request.description())
				.storeDurably(request.durable())
				.requestRecovery(request.requestsRecovery())
				.usingJobData(dataMap)
				.build();
	}

	private Set<Trigger> buildTriggers(JobKey key, List<TriggerRequest> requests) throws SchedulerException {
		Set<Trigger> triggers = HashSet.newHashSet(requests.size());
		for (TriggerRequest triggerRequest : requests) {
			if (scheduler.checkExists(TriggerKey.triggerKey(triggerRequest.key(), triggerRequest.group()))) {
				throw ApplicationProblemException.conflict("Trigger duplicado",
						"Já existe um trigger com a chave e o grupo informados.");
			}
			triggers.add(triggerFactory.build(key, triggerRequest));
		}
		return triggers;
	}

	private void persistNewJob(JobKey key, JobDetail detail, Set<Trigger> triggers, JobRequest request)
			throws SchedulerException {
		boolean quartzCreated = false;
		try {
			if (triggers.isEmpty()) {
				scheduler.addJob(detail, false);
			}
			else {
				scheduler.scheduleJob(detail, triggers, false);
			}
			quartzCreated = true;
			insertMetadata(request);
		}
		catch (ObjectAlreadyExistsException exception) {
			throw ApplicationProblemException.conflict("Rotina ou trigger duplicado",
					"Uma rotina ou um trigger com a mesma chave foi criado por outra solicitação.", exception);
		}
		catch (RuntimeException | SchedulerException exception) {
			if (quartzCreated) {
				try {
					scheduler.deleteJob(key);
				}
				catch (SchedulerException cleanupException) {
					exception.addSuppressed(cleanupException);
				}
			}
			throw exception;
		}
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public TriggerResponse updateTrigger(String jobGroup, String jobName, String triggerGroup,
			String triggerName, @Valid TriggerRequest request) throws SchedulerException {
		JobKey jobKey = JobKey.jobKey(jobName, jobGroup);
		if (!scheduler.checkExists(jobKey)) {
			throw notFound(jobGroup, jobName);
		}
		TriggerKey oldKey = TriggerKey.triggerKey(triggerName, triggerGroup);
		if (!scheduler.checkExists(oldKey)) {
			throw ApplicationProblemException.notFound("Agendamento não encontrado",
					"O trigger solicitado não existe.");
		}
		if (!triggerName.equals(request.key()) || !triggerGroup.equals(request.group())) {
			throw ApplicationProblemException.invalidInput("Chave do trigger divergente",
					"A chave e o grupo do trigger não podem ser alterados nesta operação.");
		}

		Trigger replacement = triggerFactory.build(jobKey, request);
		if (scheduler.rescheduleJob(oldKey, replacement) == null) {
			throw ApplicationProblemException.notFound("Agendamento não encontrado",
					"O trigger deixou de existir antes da atualização.");
		}
		upsertTriggerMetadata(jobKey, request);
		return queries.getTrigger(oldKey);
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public JobResponse updateJobTypeConfiguration(String group, String name,
			@Valid JobTypeConfigurationRequest request) throws SchedulerException {
		ensureJobExists(group, name);
		JobResponse current = getJob(group, name);
		if (!"HTTP_REQUEST".equals(current.type()) || current.httpRequest() == null) {
			throw ApplicationProblemException.conflict("Tipo do job não editável",
					"Somente rotinas HTTP_REQUEST podem ter sua configuração alterada por esta operação.");
		}
		if (!current.type().equals(request.type())) {
			throw ApplicationProblemException.invalidInput("Tipo do job divergente",
					"O tipo do job não pode ser alterado nesta operação.");
		}
		httpValidator.validate(request.httpRequest());

		int updated = jdbc.update("""
				UPDATE public.scheduler_job_metadata
				SET execution_configuration = ?, updated_at = ?
				WHERE job_group = ? AND job_name = ? AND job_type = ?
				""", serializeConfiguration(request.httpRequest()), timestamp(Instant.now()),
				group, name, request.type());
		if (updated == 0) {
			throw ApplicationProblemException.conflict("Metadados do job indisponíveis",
					"A rotina existe no Quartz, mas não possui uma configuração editável cadastrada.");
		}
		return getJob(group, name);
	}

	public JobResponse pauseJob(String group, String name) throws SchedulerException {
		ensureJobExists(group, name);
		scheduler.pauseJob(JobKey.jobKey(name, group));
		return getJob(group, name);
	}

	public JobResponse resumeJob(String group, String name) throws SchedulerException {
		ensureJobExists(group, name);
		scheduler.resumeJob(JobKey.jobKey(name, group));
		return getJob(group, name);
	}

	public JobResponse triggerJob(String group, String name) throws SchedulerException {
		JobResponse job = getJob(group, name);
		if (job.disallowConcurrent() && job.activeExecution() != null) {
			throw ApplicationProblemException.conflict("Rotina em execução",
					"A rotina já está em execução e não permite concorrência.");
		}
		scheduler.triggerJob(JobKey.jobKey(name, group));
		return getJob(group, name);
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public JobResponse interruptJob(String group, String name) throws SchedulerException {
		JobResponse job = getJob(group, name);
		if (!job.interruptable()) {
			throw ApplicationProblemException.conflict("Rotina não interrompível",
					"Esta rotina não aceita solicitação de interrupção.");
		}
		if (!scheduler.interrupt(JobKey.jobKey(name, group))) {
			throw ApplicationProblemException.conflict("Execução não encontrada",
					"Não há uma execução ativa desta rotina para interromper.");
		}
		jdbc.update("""
				UPDATE public.scheduler_execution_history
				SET interruption_requested = true, result = 'INTERRUPTION_REQUESTED', message = ?
				WHERE job_group = ? AND job_name = ? AND finished_at IS NULL
				""", "A interrupção foi solicitada ao nó responsável.", group, name);
		return getJob(group, name);
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public JobResponse duplicateJob(String group, String name) throws SchedulerException {
		JobResponse source = getJob(group, name);
		if (!"HTTP_REQUEST".equals(source.type()) || source.httpRequest() == null) {
			throw ApplicationProblemException.conflict("Rotina legada",
					"Somente rotinas HTTP_REQUEST podem ser duplicadas pelo contrato atual.");
		}
		String suffix = Long.toString(System.currentTimeMillis(), 36);
		String copyName = source.name() + "-copia-" + suffix.substring(Math.max(0, suffix.length() - 5));
		List<TriggerRequest> triggers = source.triggers().stream()
				.map(trigger -> new TriggerRequest(
						trigger.key() + "-copia-" + suffix.substring(Math.max(0, suffix.length() - 5)),
						trigger.group(), trigger.type(), trigger.expression(), trigger.timeZone(),
						trigger.calendar(), trigger.priority(), trigger.misfireInstruction()))
				.toList();
		JobResponse copy = createJobInternal(new JobRequest(
				copyName, source.group(), "Cópia de " + source.name() + ". Revise o agendamento antes de ativar.",
				source.type(), source.httpRequest(), source.durable(), source.requestsRecovery(), triggers));
		scheduler.pauseJob(JobKey.jobKey(copy.name(), copy.group()));
		return getJob(copy.group(), copy.name());
	}

	@Transactional(rollbackFor = SchedulerException.class)
	public void deleteJob(String group, String name) throws SchedulerException {
		ensureJobExists(group, name);
		if (!scheduler.deleteJob(JobKey.jobKey(name, group))) {
			throw notFound(group, name);
		}
		jdbc.update("DELETE FROM public.scheduler_job_metadata WHERE job_group = ? AND job_name = ?", group, name);
	}

	public List<ExecutionHistoryResponse> listExecutions(int limit) {
		return queries.listExecutions(limit);
	}

	public List<ExecutionLogResponse> listExecutionLogs(String group, String name, int limit) {
		return queries.listExecutionLogs(group, name, limit);
	}

	public ExecutionLogPageResponse searchExecutionLogs(
			String group,
			String name,
			int page,
			int pageSize,
			String sort,
			String direction,
			String level,
			String fireInstanceId,
			String query) {
		return queries.searchExecutionLogs(
				group, name, page, pageSize, sort, direction, level, fireInstanceId, query);
	}

	private void insertMetadata(JobRequest request) {
		Instant now = Instant.now();
		jdbc.update("""
				INSERT INTO public.scheduler_job_metadata (
				    job_name, job_group, description, logical_job_class, job_type, execution_configuration,
				    disallow_concurrent, persist_job_data, interruptable, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""", request.name(), request.group(), request.description(), HttpRequestJob.class.getName(),
				request.type(), serializeConfiguration(request.httpRequest()), true, false, true, timestamp(now), timestamp(now));
		for (TriggerRequest trigger : request.triggers()) {
			upsertTriggerMetadata(JobKey.jobKey(request.name(), request.group()), trigger);
		}
	}

	private void upsertTriggerMetadata(JobKey jobKey, TriggerRequest trigger) {
		jdbc.update("DELETE FROM public.scheduler_trigger_metadata WHERE trigger_name = ? AND trigger_group = ?",
				trigger.key(), trigger.group());
		Instant now = Instant.now();
		jdbc.update("""
				INSERT INTO public.scheduler_trigger_metadata (
				    trigger_name, trigger_group, job_name, job_group, trigger_type, expression,
				    time_zone, calendar_name, misfire_instruction, created_at, updated_at
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
				""", trigger.key(), trigger.group(), jobKey.getName(), jobKey.getGroup(), trigger.type(),
				trigger.expression(), trigger.timeZone(), SchedulerTriggerFactory.normalizeCalendar(trigger.calendar()),
				trigger.misfireInstruction(), timestamp(now), timestamp(now));
	}

	private void ensureJobExists(String group, String name) throws SchedulerException {
		if (!scheduler.checkExists(JobKey.jobKey(name, group))) throw notFound(group, name);
	}

	private static void validateRequestCollections(JobRequest request) {
		Set<TriggerKey> triggerKeys = HashSet.newHashSet(request.triggers().size());
		for (TriggerRequest trigger : request.triggers()) {
			if (!triggerKeys.add(TriggerKey.triggerKey(trigger.key(), trigger.group()))) {
				throw ApplicationProblemException.invalidInput("Trigger duplicado",
						"Cada chave e grupo de trigger deve aparecer apenas uma vez.");
			}
		}
	}

	private String serializeConfiguration(HttpRequestConfiguration configuration) {
		try {
			return objectMapper.writeValueAsString(configuration);
		}
		catch (Exception exception) {
			throw new IllegalStateException("Não foi possível serializar a configuração HTTP.", exception);
		}
	}

	private static ApplicationProblemException notFound(String group, String name) {
		return ApplicationProblemException.notFound("Rotina não encontrada",
				"A rotina " + group + "." + name + " não existe.");
	}

	private static Timestamp timestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}
}
