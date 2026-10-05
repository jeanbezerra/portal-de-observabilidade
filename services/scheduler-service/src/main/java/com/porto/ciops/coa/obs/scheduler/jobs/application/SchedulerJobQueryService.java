package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ActiveExecutionResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionCountsResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionHistoryResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogExecutionResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogPageResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionLogResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.ExecutionSummaryResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.JobResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerResponse;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.quartz.CronTrigger;
import org.quartz.CalendarIntervalTrigger;
import org.quartz.DailyTimeIntervalTrigger;
import org.quartz.InterruptableJob;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SimpleTrigger;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.quartz.impl.matchers.GroupMatcher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SchedulerJobQueryService {

	private static final Logger LOGGER = LoggerFactory.getLogger(SchedulerJobQueryService.class);
	private static final String NO_CALENDAR = "Sem calendário de exclusão";
	private static final String LOG_LEVEL_COLUMN = "level";
	private static final String LOG_LEVEL_ERROR = "ERROR";
	private static final String DEFAULT_LOG_SORT = "loggedAt";
	private static final String JOB_GROUP_COLUMN = "job_group";
	private static final String JOB_NAME_COLUMN = "job_name";
	private static final String RESULT_COLUMN = "result";
	private static final String MESSAGE_COLUMN = "message";
	private static final String FIRE_INSTANCE_ID_COLUMN = "fire_instance_id";
	private static final Set<String> LOG_SORTS = Set.of(DEFAULT_LOG_SORT, LOG_LEVEL_COLUMN, "source", "execution");
	private static final ExecutionCountsResponse NO_EXECUTIONS = new ExecutionCountsResponse(0, 0);
	private static final String EXECUTION_LOG_FILTER_SQL = """
			FROM public.scheduler_execution_log log
			JOIN public.scheduler_execution_history history
			  ON history.fire_instance_id = log.fire_instance_id
			WHERE history.job_group = :jobGroup AND history.job_name = :jobName
			  AND (:fireInstanceId IS NULL OR log.fire_instance_id = :fireInstanceId)
			  AND (:query IS NULL OR POSITION(LOWER(:query) IN LOWER(
			      log.fire_instance_id || ' ' || log.level || ' ' || log.log_source || ' '
			      || log.message || ' ' || COALESCE(log.details, '')
			  )) > 0)
			  AND (:level IS NULL OR log.level = :level)
			""";
	private static final String COUNT_EXECUTION_LOGS_SQL = "SELECT count(*) " + EXECUTION_LOG_FILTER_SQL;
	private static final String COUNT_EXECUTION_LOG_LEVELS_SQL =
			"SELECT log.level, count(*) AS log_count " + EXECUTION_LOG_FILTER_SQL + " GROUP BY log.level";
	private static final String SEARCH_EXECUTION_LOGS_SQL = """
			SELECT log.id, log.fire_instance_id, log.logged_at, log.level,
			       log.log_source, log.message, log.details
			""" + EXECUTION_LOG_FILTER_SQL + """
			ORDER BY
			  CASE WHEN :sort = 'loggedAt' AND :direction = 'asc' THEN log.logged_at END ASC,
			  CASE WHEN :sort = 'loggedAt' AND :direction = 'desc' THEN log.logged_at END DESC,
			  CASE WHEN :sort = 'level' AND :direction = 'asc'
			       THEN CASE log.level WHEN 'ERROR' THEN 3 WHEN 'WARN' THEN 2 ELSE 1 END END ASC,
			  CASE WHEN :sort = 'level' AND :direction = 'desc'
			       THEN CASE log.level WHEN 'ERROR' THEN 3 WHEN 'WARN' THEN 2 ELSE 1 END END DESC,
			  CASE WHEN :sort = 'source' AND :direction = 'asc' THEN LOWER(log.log_source) END ASC,
			  CASE WHEN :sort = 'source' AND :direction = 'desc' THEN LOWER(log.log_source) END DESC,
			  CASE WHEN :sort = 'execution' AND :direction = 'asc' THEN history.actual_fire_time END ASC,
			  CASE WHEN :sort = 'execution' AND :direction = 'desc' THEN history.actual_fire_time END DESC,
			  CASE WHEN :direction = 'asc' THEN log.id END ASC,
			  log.id DESC
			LIMIT :limit OFFSET :offset
			""";

	private final Scheduler scheduler;
	private final JdbcTemplate jdbc;
	private final NamedParameterJdbcTemplate namedJdbc;
	private final tools.jackson.databind.ObjectMapper objectMapper;

	public SchedulerJobQueryService(Scheduler scheduler, JdbcTemplate jdbc, NamedParameterJdbcTemplate namedJdbc,
			tools.jackson.databind.ObjectMapper objectMapper) {
		this.scheduler = scheduler;
		this.jdbc = jdbc;
		this.namedJdbc = namedJdbc;
		this.objectMapper = objectMapper;
	}

	public List<JobResponse> listJobs() throws SchedulerException {
		Map<JobKey, ActiveExecutionResponse> active = loadClusterActiveExecutions();
		Map<JobKey, ExecutionCountsResponse> executionCounts = loadExecutionCounts();
		for (JobExecutionContext context : scheduler.getCurrentlyExecutingJobs()) {
			active.put(context.getJobDetail().getKey(), toActiveExecution(context));
		}

		Set<JobKey> jobKeys = scheduler.getJobKeys(GroupMatcher.anyJobGroup());
		List<JobResponse> jobs = new ArrayList<>(jobKeys.size());
		for (JobKey key : jobKeys) {
			jobs.add(toJobResponse(
					scheduler.getJobDetail(key), active.get(key),
					executionCounts.getOrDefault(key, NO_EXECUTIONS)));
		}
		jobs.sort(Comparator.comparing(JobResponse::group).thenComparing(JobResponse::name));
		return jobs;
	}

	public JobResponse getJob(String group, String name) throws SchedulerException {
		JobKey key = JobKey.jobKey(name, group);
		JobDetail detail = scheduler.getJobDetail(key);
		if (detail == null) throw notFound(group, name);
		ActiveExecutionResponse active = scheduler.getCurrentlyExecutingJobs().stream()
				.filter(context -> context.getJobDetail().getKey().equals(key))
				.map(this::toActiveExecution)
				.findFirst().orElseGet(() -> loadClusterActiveExecutions().get(key));
		return toJobResponse(detail, active, loadExecutionCounts(key));
	}

	public List<ExecutionHistoryResponse> listExecutions(int limit) {
		int safeLimit = Math.clamp(limit, 1, 500);
		return jdbc.query("""
				SELECT id, fire_instance_id, job_name, job_group, trigger_name, trigger_group,
				       scheduler_instance, scheduled_fire_time, actual_fire_time, finished_at,
				       duration_ms, result, message, refire_count, recovering, interruption_requested
				FROM public.scheduler_execution_history
				ORDER BY actual_fire_time DESC, id DESC
				LIMIT ?
				""", (resultSet, _) -> mapExecution(resultSet), safeLimit);
	}

	public List<ExecutionLogResponse> listExecutionLogs(String group, String name, int limit) {
		int safeLimit = Math.clamp(limit, 1, 1_000);
		return jdbc.query("""
				SELECT log.id, log.fire_instance_id, log.logged_at, log.level,
				       log.log_source, log.message, log.details
				FROM public.scheduler_execution_log log
				JOIN public.scheduler_execution_history history
				  ON history.fire_instance_id = log.fire_instance_id
				WHERE history.job_group = ? AND history.job_name = ?
				ORDER BY log.logged_at DESC, log.id DESC
				LIMIT ?
				""", (resultSet, _) -> mapExecutionLog(resultSet), group, name, safeLimit);
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
		int safePageSize = Math.clamp(pageSize, 10, 100);
		String normalizedLevel = normalizeLogLevel(level);
		String normalizedQuery = normalizeLogQuery(query);
		String normalizedSort = normalizeLogSort(sort);
		String normalizedDirection = normalizeLogDirection(direction);
		MapSqlParameterSource parameters = new MapSqlParameterSource()
				.addValue("jobGroup", group)
				.addValue("jobName", name)
				.addValue("fireInstanceId", normalizeOptional(fireInstanceId), Types.VARCHAR)
				.addValue("query", normalizedQuery, Types.VARCHAR)
				.addValue(LOG_LEVEL_COLUMN, normalizedLevel, Types.VARCHAR)
				.addValue("sort", normalizedSort)
				.addValue("direction", normalizedDirection);

		Long totalValue = namedJdbc.queryForObject(COUNT_EXECUTION_LOGS_SQL, parameters, Long.class);
		long totalItems = totalValue == null ? 0 : totalValue;
		int totalPages = totalItems == 0
				? 0
				: (int) Math.min(Integer.MAX_VALUE, (totalItems + safePageSize - 1) / safePageSize);
		int safePage = totalPages == 0 ? 0 : Math.clamp(page, 0, totalPages - 1);

		parameters.addValue("limit", safePageSize);
		parameters.addValue("offset", (long) safePage * safePageSize);
		List<ExecutionLogResponse> items = namedJdbc.query(
				SEARCH_EXECUTION_LOGS_SQL, parameters, (resultSet, _) -> mapExecutionLog(resultSet));

		Map<String, Long> counts = new HashMap<>();
		namedJdbc.query(COUNT_EXECUTION_LOG_LEVELS_SQL, parameters,
				(resultSet, _) -> new LogLevelCount(
						resultSet.getString(LOG_LEVEL_COLUMN), resultSet.getLong("log_count")))
				.forEach(count -> counts.put(count.level(), count.count()));

		List<ExecutionLogExecutionResponse> executions = jdbc.query("""
				SELECT history.fire_instance_id, history.actual_fire_time, history.result,
				       count(log.id) AS log_count
				FROM public.scheduler_execution_history history
				JOIN public.scheduler_execution_log log
				  ON log.fire_instance_id = history.fire_instance_id
				WHERE history.job_group = ? AND history.job_name = ?
				GROUP BY history.id, history.fire_instance_id, history.actual_fire_time, history.result
				ORDER BY history.actual_fire_time DESC, history.id DESC
				LIMIT 200
				""", (resultSet, _) -> mapExecutionLogExecution(resultSet), group, name);

		return new ExecutionLogPageResponse(
				items, safePage, safePageSize, totalItems, totalPages,
				counts.getOrDefault("INFO", 0L), counts.getOrDefault("WARN", 0L),
				counts.getOrDefault(LOG_LEVEL_ERROR, 0L), executions);
	}

	TriggerResponse getTrigger(TriggerKey key) throws SchedulerException {
		Trigger trigger = scheduler.getTrigger(key);
		if (trigger == null) {
			throw ApplicationProblemException.notFound("Agendamento não encontrado",
					"O trigger solicitado não existe.");
		}
		return toTriggerResponse(trigger, loadTriggerMetadata(key));
	}

	private JobResponse toJobResponse(
			JobDetail detail,
			ActiveExecutionResponse activeExecution,
			ExecutionCountsResponse executionCounts) throws SchedulerException {
		JobKey key = detail.getKey();
		List<TriggerResponse> triggers = scheduler.getTriggersOfJob(key).stream()
				.map((Trigger trigger) -> {
					try {
						return toTriggerResponse(trigger, loadTriggerMetadata(trigger.getKey()));
					}
					catch (SchedulerException exception) {
						throw new IllegalStateException(exception);
					}
				})
				.sorted(Comparator.comparing(TriggerResponse::group).thenComparing(TriggerResponse::key))
				.toList();
		JobMetadata metadata = loadJobMetadata(key);
		boolean disallowConcurrent = metadata == null
				? detail.isConcurrentExecutionDisallowed() : metadata.disallowConcurrent();
		boolean persistJobData = metadata == null
				? detail.isPersistJobDataAfterExecution() : metadata.persistJobData();
		boolean interruptable = metadata == null
				? InterruptableJob.class.isAssignableFrom(detail.getJobClass()) : metadata.interruptable();
		String jobType = metadata == null ? detail.getJobDataMap().getString("_jobType") : metadata.jobType();
		if (jobType == null || jobType.isBlank()) jobType = "LEGACY_JAVA";
		HttpRequestConfiguration httpRequest = metadata == null
				? null : deserializeConfiguration(metadata.executionConfiguration());

		return new JobResponse(
				key.getGroup() + "." + key.getName(), key.getName(), key.getGroup(),
				metadata == null ? nullToEmpty(detail.getDescription()) : metadata.description(), jobType, httpRequest,
				detail.isDurable(), detail.requestsRecovery(), disallowConcurrent, persistJobData, interruptable,
				triggers, activeExecution, executionCounts, loadLastExecution(key));
	}

	private TriggerResponse toTriggerResponse(Trigger trigger, TriggerMetadata metadata) throws SchedulerException {
		String type = metadata == null ? triggerType(trigger) : metadata.type();
		String expression = metadata == null ? deriveExpression(trigger) : metadata.expression();
		String timeZone = metadata == null ? deriveTimeZone(trigger) : metadata.timeZone();
		String configuredCalendar = metadata == null ? trigger.getCalendarName() : metadata.calendar();
		String calendar = nullToDefaultCalendar(configuredCalendar);
		String misfire = metadata == null ? Integer.toString(trigger.getMisfireInstruction()) : metadata.misfireInstruction();
		return new TriggerResponse(
				trigger.getKey().getName(), trigger.getKey().getGroup(), type,
				normalizeTriggerState(scheduler.getTriggerState(trigger.getKey())),
				type + ": " + expression, expression, timeZone, calendar,
				instant(trigger.getNextFireTime()), instant(trigger.getPreviousFireTime()),
				instant(trigger.getStartTime()), instant(trigger.getEndTime()), trigger.getPriority(), misfire);
	}

	private ActiveExecutionResponse toActiveExecution(JobExecutionContext context) {
		Instant actual = context.getFireTime().toInstant();
		return new ActiveExecutionResponse(
				isInterruptionRequested(context.getFireInstanceId()) ? "INTERRUPTION_REQUESTED" : "RUNNING",
				context.getFireInstanceId(), schedulerInstance(), schedulerInstance(),
				instant(context.getScheduledFireTime()), actual,
				Math.max(0, Duration.between(actual, Instant.now()).toMillis()), context.getRefireCount(), context.isRecovering());
	}

	private Map<JobKey, ActiveExecutionResponse> loadClusterActiveExecutions() {
		Map<JobKey, ActiveExecutionResponse> active = new HashMap<>();
		jdbc.query("""
				SELECT entry_id, instance_name, fired_time, sched_time, job_name, job_group,
				       trigger_group, state
				FROM public.qrtz_fired_triggers
				WHERE sched_name = ? AND job_name IS NOT NULL AND job_group IS NOT NULL
				ORDER BY fired_time DESC
				""", (ResultSet resultSet) -> {
			JobKey key = JobKey.jobKey(resultSet.getString(JOB_NAME_COLUMN), resultSet.getString(JOB_GROUP_COLUMN));
			if (active.containsKey(key)) return;
			String fireInstanceId = resultSet.getString("entry_id");
			String instance = resultSet.getString("instance_name");
			Instant firedAt = Instant.ofEpochMilli(resultSet.getLong("fired_time"));
			long scheduledAtValue = resultSet.getLong("sched_time");
			Instant scheduledAt = resultSet.wasNull() ? null : Instant.ofEpochMilli(scheduledAtValue);
			active.put(key, new ActiveExecutionResponse(
					isInterruptionRequested(fireInstanceId) ? "INTERRUPTION_REQUESTED" : "RUNNING",
					fireInstanceId, instance, instance, scheduledAt, firedAt,
					Math.max(0, Duration.between(firedAt, Instant.now()).toMillis()), 0,
					Scheduler.DEFAULT_RECOVERY_GROUP.equals(resultSet.getString("trigger_group"))));
		}, schedulerName());
		return active;
	}

	private ExecutionSummaryResponse loadLastExecution(JobKey key) {
		List<ExecutionSummaryResponse> summaries = jdbc.query("""
				SELECT result, finished_at, duration_ms, message
				FROM public.scheduler_execution_history
				WHERE job_group = ? AND job_name = ? AND finished_at IS NOT NULL
				ORDER BY finished_at DESC, id DESC
				LIMIT 1
				""", (resultSet, _) -> new ExecutionSummaryResponse(
				resultSet.getString(RESULT_COLUMN), instant(resultSet, "finished_at"),
				resultSet.getLong("duration_ms"), resultSet.getString(MESSAGE_COLUMN)), key.getGroup(), key.getName());
		return summaries.isEmpty()
				? new ExecutionSummaryResponse("NONE", null, 0, "Nenhuma execução registrada.")
				: summaries.getFirst();
	}

	private Map<JobKey, ExecutionCountsResponse> loadExecutionCounts() {
		Map<JobKey, ExecutionCountsResponse> counts = new HashMap<>();
		jdbc.query("""
				SELECT job_group, job_name,
				       SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) AS success_count,
				       SUM(CASE WHEN result = 'FAILED' THEN 1 ELSE 0 END) AS failure_count
				FROM public.scheduler_execution_history
				WHERE result IN ('SUCCESS', 'FAILED')
				GROUP BY job_group, job_name
				""", (ResultSet resultSet) -> counts.put(
					JobKey.jobKey(resultSet.getString(JOB_NAME_COLUMN), resultSet.getString(JOB_GROUP_COLUMN)),
					new ExecutionCountsResponse(
							resultSet.getLong("success_count"), resultSet.getLong("failure_count"))));
		return counts;
	}

	private ExecutionCountsResponse loadExecutionCounts(JobKey key) {
		List<ExecutionCountsResponse> counts = jdbc.query("""
				SELECT SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) AS success_count,
				       SUM(CASE WHEN result = 'FAILED' THEN 1 ELSE 0 END) AS failure_count
				FROM public.scheduler_execution_history
				WHERE job_group = ? AND job_name = ?
				  AND result IN ('SUCCESS', 'FAILED')
				""", (resultSet, _) -> new ExecutionCountsResponse(
				resultSet.getLong("success_count"), resultSet.getLong("failure_count")),
				key.getGroup(), key.getName());
		return counts.isEmpty() ? NO_EXECUTIONS : counts.getFirst();
	}

	private JobMetadata loadJobMetadata(JobKey key) {
		List<JobMetadata> rows = jdbc.query("""
				SELECT description, job_type, execution_configuration,
				       disallow_concurrent, persist_job_data, interruptable
				FROM public.scheduler_job_metadata WHERE job_group = ? AND job_name = ?
				""", (resultSet, _) -> new JobMetadata(
				resultSet.getString("description"), resultSet.getString("job_type"),
				resultSet.getString("execution_configuration"),
				resultSet.getBoolean("disallow_concurrent"), resultSet.getBoolean("persist_job_data"),
				resultSet.getBoolean("interruptable")), key.getGroup(), key.getName());
		return rows.isEmpty() ? null : rows.getFirst();
	}

	private HttpRequestConfiguration deserializeConfiguration(String value) {
		if (value == null || value.isBlank()) return null;
		try {
			return objectMapper.readValue(value, HttpRequestConfiguration.class);
		}
		catch (Exception exception) {
			throw new IllegalStateException("A configuração HTTP armazenada é inválida.", exception);
		}
	}

	private TriggerMetadata loadTriggerMetadata(TriggerKey key) {
		List<TriggerMetadata> rows = jdbc.query("""
				SELECT trigger_type, expression, time_zone, calendar_name, misfire_instruction
				FROM public.scheduler_trigger_metadata WHERE trigger_group = ? AND trigger_name = ?
				""", (resultSet, _) -> new TriggerMetadata(
				resultSet.getString("trigger_type"), resultSet.getString("expression"),
				resultSet.getString("time_zone"), resultSet.getString("calendar_name"),
				resultSet.getString("misfire_instruction")), key.getGroup(), key.getName());
		return rows.isEmpty() ? null : rows.getFirst();
	}

	private boolean isInterruptionRequested(String fireInstanceId) {
		Long count = jdbc.queryForObject("""
				SELECT count(*) FROM public.scheduler_execution_history
				WHERE fire_instance_id = ? AND interruption_requested = true
				""", Long.class, fireInstanceId);
		return count != null && count > 0;
	}

	private String schedulerInstance() {
		try {
			return scheduler.getSchedulerInstanceId();
		}
		catch (SchedulerException exception) {
			LOGGER.warn("Não foi possível identificar a instância do scheduler.", exception);
			return "unknown";
		}
	}

	private String schedulerName() {
		try {
			return scheduler.getSchedulerName();
		}
		catch (SchedulerException exception) {
			throw new IllegalStateException("Não foi possível consultar o nome do scheduler.", exception);
		}
	}

	private static String triggerType(Trigger trigger) {
		return switch (trigger) {
			case SimpleTrigger _ -> "SimpleTrigger";
			case CalendarIntervalTrigger _ -> "CalendarIntervalTrigger";
			case DailyTimeIntervalTrigger _ -> "DailyTimeIntervalTrigger";
			default -> "CronTrigger";
		};
	}

	private static String deriveExpression(Trigger trigger) {
		return switch (trigger) {
			case CronTrigger cron -> cron.getCronExpression();
			case SimpleTrigger simple -> "INTERVAL " + simple.getRepeatInterval() + " MILLISECONDS · REPEAT "
					+ (simple.getRepeatCount() < 0 ? "FOREVER" : simple.getRepeatCount());
			case CalendarIntervalTrigger calendar ->
					calendar.getRepeatInterval() + " " + calendar.getRepeatIntervalUnit();
			case DailyTimeIntervalTrigger daily ->
					"EVERYDAY · " + daily.getStartTimeOfDay() + "-" + daily.getEndTimeOfDay()
							+ " · INTERVAL " + daily.getRepeatInterval() + " " + daily.getRepeatIntervalUnit();
			default -> "";
		};
	}

	private static String deriveTimeZone(Trigger trigger) {
		if (trigger instanceof CronTrigger cron) return cron.getTimeZone().getID();
		if (trigger instanceof org.quartz.CalendarIntervalTrigger calendar) return calendar.getTimeZone().getID();
		return ZoneId.systemDefault().getId();
	}

	private static String normalizeTriggerState(Trigger.TriggerState state) {
		return switch (state) {
			case PAUSED -> "PAUSED";
			case BLOCKED -> "BLOCKED";
			case ERROR -> LOG_LEVEL_ERROR;
			case COMPLETE -> "COMPLETE";
			case NONE -> "NONE";
			default -> "NORMAL";
		};
	}

	private static String nullToDefaultCalendar(String calendar) {
		return calendar == null || calendar.isBlank() ? NO_CALENDAR : calendar;
	}

	private static ApplicationProblemException notFound(String group, String name) {
		return ApplicationProblemException.notFound("Rotina não encontrada",
				"A rotina " + group + "." + name + " não existe.");
	}

	private static Instant instant(Date value) {
		return value == null ? null : value.toInstant();
	}

	private static Instant instant(ResultSet resultSet, String column) throws SQLException {
		Timestamp value = resultSet.getTimestamp(column);
		return value == null ? null : value.toInstant();
	}

	private static String nullToEmpty(String value) {
		return value == null ? "" : value;
	}

	private static ExecutionHistoryResponse mapExecution(ResultSet resultSet) throws SQLException {
		long duration = resultSet.getLong("duration_ms");
		boolean durationIsNull = resultSet.wasNull();
		return new ExecutionHistoryResponse(
				resultSet.getLong("id"), resultSet.getString(FIRE_INSTANCE_ID_COLUMN),
				resultSet.getString(JOB_NAME_COLUMN), resultSet.getString(JOB_GROUP_COLUMN),
				resultSet.getString("trigger_name"), resultSet.getString("trigger_group"),
				resultSet.getString("scheduler_instance"), instant(resultSet, "scheduled_fire_time"),
				instant(resultSet, "actual_fire_time"), instant(resultSet, "finished_at"),
				durationIsNull ? null : duration, resultSet.getString(RESULT_COLUMN), resultSet.getString(MESSAGE_COLUMN),
				resultSet.getInt("refire_count"), resultSet.getBoolean("recovering"),
				resultSet.getBoolean("interruption_requested"));
	}

	private static ExecutionLogResponse mapExecutionLog(ResultSet resultSet) throws SQLException {
		return new ExecutionLogResponse(
				resultSet.getLong("id"), resultSet.getString(FIRE_INSTANCE_ID_COLUMN),
				instant(resultSet, "logged_at"), resultSet.getString(LOG_LEVEL_COLUMN),
				resultSet.getString("log_source"), resultSet.getString(MESSAGE_COLUMN),
				resultSet.getString("details"));
	}

	private static ExecutionLogExecutionResponse mapExecutionLogExecution(ResultSet resultSet) throws SQLException {
		return new ExecutionLogExecutionResponse(
				resultSet.getString(FIRE_INSTANCE_ID_COLUMN), instant(resultSet, "actual_fire_time"),
				resultSet.getString(RESULT_COLUMN), resultSet.getLong("log_count"));
	}

	private static String normalizeLogDirection(String direction) {
		String normalized = direction == null ? "desc" : direction.toLowerCase(Locale.ROOT);
		if ("asc".equals(normalized) || "desc".equals(normalized)) {
			return normalized;
		}
		throw ApplicationProblemException.invalidInput(
				"Direção de ordenação inválida", "Use asc ou desc para ordenar os logs.");
	}

	private static String normalizeLogSort(String sort) {
		String normalized = sort == null ? DEFAULT_LOG_SORT : sort;
		if (LOG_SORTS.contains(normalized)) {
			return normalized;
		}
		throw ApplicationProblemException.invalidInput(
				"Ordenação de logs inválida", "Use loggedAt, level, source ou execution.");
	}

	private static String normalizeOptional(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

	private static String normalizeLogLevel(String level) {
		if (level == null || level.isBlank() || "ALL".equalsIgnoreCase(level)) return null;
		String normalized = level.toUpperCase(Locale.ROOT);
		if (!List.of("INFO", "WARN", LOG_LEVEL_ERROR).contains(normalized)) {
			throw ApplicationProblemException.invalidInput(
					"Nível de log inválido", "Use INFO, WARN ou ERROR para filtrar os logs.");
		}
		return normalized;
	}

	private static String normalizeLogQuery(String query) {
		if (query == null || query.isBlank()) return null;
		String normalized = query.trim();
		return normalized.length() > 200 ? normalized.substring(0, 200) : normalized;
	}

	private record JobMetadata(
			String description,
			String jobType,
			String executionConfiguration,
			boolean disallowConcurrent,
			boolean persistJobData,
			boolean interruptable) {
	}

	private record TriggerMetadata(
			String type,
			String expression,
			String timeZone,
			String calendar,
			String misfireInstruction) {
	}

	private record LogLevelCount(String level, long count) {
	}
}
