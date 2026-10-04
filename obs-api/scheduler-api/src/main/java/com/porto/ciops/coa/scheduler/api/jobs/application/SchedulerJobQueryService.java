package com.porto.ciops.coa.scheduler.api.jobs.application;

import com.porto.ciops.coa.scheduler.api.jobs.application.model.ActiveExecutionResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionCountsResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionHistoryResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionLogExecutionResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionLogPageResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionLogResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionSummaryResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.HttpRequestConfiguration;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.JobResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.TriggerResponse;
import com.porto.ciops.coa.scheduler.api.support.ApplicationProblemException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
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
import org.quartz.CronTrigger;
import org.quartz.InterruptableJob;
import org.quartz.JobDetail;
import org.quartz.JobExecutionContext;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.quartz.impl.matchers.GroupMatcher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class SchedulerJobQueryService {

	private static final String NO_CALENDAR = "Sem calendário de exclusão";
	private static final ExecutionCountsResponse NO_EXECUTIONS = new ExecutionCountsResponse(0, 0);

	private final Scheduler scheduler;
	private final JdbcTemplate jdbc;
	private final tools.jackson.databind.ObjectMapper objectMapper;

	public SchedulerJobQueryService(Scheduler scheduler, JdbcTemplate jdbc,
			tools.jackson.databind.ObjectMapper objectMapper) {
		this.scheduler = scheduler;
		this.jdbc = jdbc;
		this.objectMapper = objectMapper;
	}

	public List<JobResponse> listJobs() throws SchedulerException {
		Map<JobKey, ActiveExecutionResponse> active = loadClusterActiveExecutions();
		Map<JobKey, ExecutionCountsResponse> executionCounts = loadExecutionCounts();
		for (JobExecutionContext context : scheduler.getCurrentlyExecutingJobs()) {
			active.put(context.getJobDetail().getKey(), toActiveExecution(context));
		}

		List<JobResponse> jobs = new ArrayList<>();
		for (JobKey key : scheduler.getJobKeys(GroupMatcher.anyJobGroup())) {
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
		int safeLimit = Math.max(1, Math.min(limit, 500));
		return jdbc.query("""
				SELECT id, fire_instance_id, job_name, job_group, trigger_name, trigger_group,
				       scheduler_instance, scheduled_fire_time, actual_fire_time, finished_at,
				       duration_ms, result, message, refire_count, recovering, interruption_requested
				FROM public.scheduler_execution_history
				ORDER BY actual_fire_time DESC, id DESC
				LIMIT ?
				""", SchedulerJobQueryService::mapExecution, safeLimit);
	}

	public List<ExecutionLogResponse> listExecutionLogs(String group, String name, int limit) {
		int safeLimit = Math.max(1, Math.min(limit, 1_000));
		return jdbc.query("""
				SELECT log.id, log.fire_instance_id, log.logged_at, log.level,
				       log.log_source, log.message, log.details
				FROM public.scheduler_execution_log log
				JOIN public.scheduler_execution_history history
				  ON history.fire_instance_id = log.fire_instance_id
				WHERE history.job_group = ? AND history.job_name = ?
				ORDER BY log.logged_at DESC, log.id DESC
				LIMIT ?
				""", SchedulerJobQueryService::mapExecutionLog, group, name, safeLimit);
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
		int safePageSize = Math.max(10, Math.min(pageSize, 100));
		String normalizedLevel = normalizeLogLevel(level);
		String normalizedQuery = normalizeLogQuery(query);
		String orderBy = executionLogOrder(sort, direction);

		ExecutionLogFilter pageFilter = executionLogFilter(
				group, name, fireInstanceId, normalizedQuery, normalizedLevel);

		Long totalValue = jdbc.queryForObject(
				"SELECT count(*) " + pageFilter.sql(), Long.class, pageFilter.arguments().toArray());
		long totalItems = totalValue == null ? 0 : totalValue;
		int totalPages = totalItems == 0
				? 0
				: (int) Math.min(Integer.MAX_VALUE, (totalItems + safePageSize - 1) / safePageSize);
		int safePage = totalPages == 0 ? 0 : Math.max(0, Math.min(page, totalPages - 1));

		List<Object> pageArguments = new ArrayList<>(pageFilter.arguments());
		pageArguments.add(safePageSize);
		pageArguments.add((long) safePage * safePageSize);
		List<ExecutionLogResponse> items = jdbc.query("""
				SELECT log.id, log.fire_instance_id, log.logged_at, log.level,
				       log.log_source, log.message, log.details
				""" + pageFilter.sql() + orderBy + " LIMIT ? OFFSET ?",
				SchedulerJobQueryService::mapExecutionLog, pageArguments.toArray());

		Map<String, Long> counts = new HashMap<>();
		jdbc.query("SELECT log.level, count(*) AS log_count " + pageFilter.sql() + " GROUP BY log.level",
				(resultSet, rowNumber) -> new LogLevelCount(
						resultSet.getString("level"), resultSet.getLong("log_count")),
				pageFilter.arguments().toArray())
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
				""", SchedulerJobQueryService::mapExecutionLogExecution, group, name);

		return new ExecutionLogPageResponse(
				items, safePage, safePageSize, totalItems, totalPages,
				counts.getOrDefault("INFO", 0L), counts.getOrDefault("WARN", 0L),
				counts.getOrDefault("ERROR", 0L), executions);
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
		JobMetadata metadata = loadJobMetadata(key);
		List<TriggerResponse> triggers = scheduler.getTriggersOfJob(key).stream()
				.map(trigger -> {
					try {
						return toTriggerResponse(trigger, loadTriggerMetadata(trigger.getKey()));
					}
					catch (SchedulerException exception) {
						throw new IllegalStateException(exception);
					}
				})
				.sorted(Comparator.comparing(TriggerResponse::group).thenComparing(TriggerResponse::key))
				.toList();
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
		String calendar = metadata == null ? nullToDefaultCalendar(trigger.getCalendarName())
				: nullToDefaultCalendar(metadata.calendar());
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
				""", resultSet -> {
			JobKey key = JobKey.jobKey(resultSet.getString("job_name"), resultSet.getString("job_group"));
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
				""", (resultSet, rowNumber) -> new ExecutionSummaryResponse(
				resultSet.getString("result"), instant(resultSet, "finished_at"),
				resultSet.getLong("duration_ms"), resultSet.getString("message")), key.getGroup(), key.getName());
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
				""", resultSet -> {
			counts.put(
					JobKey.jobKey(resultSet.getString("job_name"), resultSet.getString("job_group")),
					new ExecutionCountsResponse(
							resultSet.getLong("success_count"), resultSet.getLong("failure_count")));
		});
		return counts;
	}

	private ExecutionCountsResponse loadExecutionCounts(JobKey key) {
		List<ExecutionCountsResponse> counts = jdbc.query("""
				SELECT SUM(CASE WHEN result = 'SUCCESS' THEN 1 ELSE 0 END) AS success_count,
				       SUM(CASE WHEN result = 'FAILED' THEN 1 ELSE 0 END) AS failure_count
				FROM public.scheduler_execution_history
				WHERE job_group = ? AND job_name = ?
				  AND result IN ('SUCCESS', 'FAILED')
				""", (resultSet, rowNumber) -> new ExecutionCountsResponse(
				resultSet.getLong("success_count"), resultSet.getLong("failure_count")),
				key.getGroup(), key.getName());
		return counts.isEmpty() ? NO_EXECUTIONS : counts.getFirst();
	}

	private JobMetadata loadJobMetadata(JobKey key) {
		List<JobMetadata> rows = jdbc.query("""
				SELECT description, job_type, execution_configuration,
				       disallow_concurrent, persist_job_data, interruptable
				FROM public.scheduler_job_metadata WHERE job_group = ? AND job_name = ?
				""", (resultSet, rowNumber) -> new JobMetadata(
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
				""", (resultSet, rowNumber) -> new TriggerMetadata(
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
		if (trigger instanceof org.quartz.SimpleTrigger) return "SimpleTrigger";
		if (trigger instanceof org.quartz.CalendarIntervalTrigger) return "CalendarIntervalTrigger";
		if (trigger instanceof org.quartz.DailyTimeIntervalTrigger) return "DailyTimeIntervalTrigger";
		return "CronTrigger";
	}

	private static String deriveExpression(Trigger trigger) {
		if (trigger instanceof CronTrigger cron) return cron.getCronExpression();
		if (trigger instanceof org.quartz.SimpleTrigger simple) {
			return "INTERVAL " + simple.getRepeatInterval() + " MILLISECONDS · REPEAT "
					+ (simple.getRepeatCount() < 0 ? "FOREVER" : simple.getRepeatCount());
		}
		if (trigger instanceof org.quartz.CalendarIntervalTrigger calendar) {
			return calendar.getRepeatInterval() + " " + calendar.getRepeatIntervalUnit();
		}
		if (trigger instanceof org.quartz.DailyTimeIntervalTrigger daily) {
			return "EVERYDAY · " + daily.getStartTimeOfDay() + "-" + daily.getEndTimeOfDay()
					+ " · INTERVAL " + daily.getRepeatInterval() + " " + daily.getRepeatIntervalUnit();
		}
		return "";
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
			case ERROR -> "ERROR";
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

	private static ExecutionHistoryResponse mapExecution(ResultSet resultSet, int rowNumber) throws SQLException {
		long duration = resultSet.getLong("duration_ms");
		boolean durationIsNull = resultSet.wasNull();
		return new ExecutionHistoryResponse(
				resultSet.getLong("id"), resultSet.getString("fire_instance_id"),
				resultSet.getString("job_name"), resultSet.getString("job_group"),
				resultSet.getString("trigger_name"), resultSet.getString("trigger_group"),
				resultSet.getString("scheduler_instance"), instant(resultSet, "scheduled_fire_time"),
				instant(resultSet, "actual_fire_time"), instant(resultSet, "finished_at"),
				durationIsNull ? null : duration, resultSet.getString("result"), resultSet.getString("message"),
				resultSet.getInt("refire_count"), resultSet.getBoolean("recovering"),
				resultSet.getBoolean("interruption_requested"));
	}

	private static ExecutionLogResponse mapExecutionLog(ResultSet resultSet, int rowNumber) throws SQLException {
		return new ExecutionLogResponse(
				resultSet.getLong("id"), resultSet.getString("fire_instance_id"),
				instant(resultSet, "logged_at"), resultSet.getString("level"),
				resultSet.getString("log_source"), resultSet.getString("message"),
				resultSet.getString("details"));
	}

	private static ExecutionLogExecutionResponse mapExecutionLogExecution(
			ResultSet resultSet, int rowNumber) throws SQLException {
		return new ExecutionLogExecutionResponse(
				resultSet.getString("fire_instance_id"), instant(resultSet, "actual_fire_time"),
				resultSet.getString("result"), resultSet.getLong("log_count"));
	}

	private static ExecutionLogFilter executionLogFilter(
			String group,
			String name,
			String fireInstanceId,
			String query,
			String level) {
		StringBuilder sql = new StringBuilder("""
				FROM public.scheduler_execution_log log
				JOIN public.scheduler_execution_history history
				  ON history.fire_instance_id = log.fire_instance_id
				WHERE history.job_group = ? AND history.job_name = ?
				""");
		List<Object> arguments = new ArrayList<>();
		arguments.add(group);
		arguments.add(name);
		if (fireInstanceId != null && !fireInstanceId.isBlank()) {
			sql.append(" AND log.fire_instance_id = ?");
			arguments.add(fireInstanceId.trim());
		}
		if (query != null && !query.isBlank()) {
			sql.append("""
					 AND POSITION(LOWER(?) IN LOWER(
					     log.fire_instance_id || ' ' || log.level || ' ' || log.log_source || ' '
					     || log.message || ' ' || COALESCE(log.details, '')
					 )) > 0
					""");
			arguments.add(query);
		}
		if (level != null) {
			sql.append(" AND log.level = ?");
			arguments.add(level);
		}
		return new ExecutionLogFilter(sql.toString(), List.copyOf(arguments));
	}

	private static String executionLogOrder(String sort, String direction) {
		String safeDirection = switch (direction == null ? "desc" : direction.toLowerCase(Locale.ROOT)) {
			case "asc" -> "ASC";
			case "desc" -> "DESC";
			default -> throw ApplicationProblemException.invalidInput(
					"Direção de ordenação inválida", "Use asc ou desc para ordenar os logs.");
		};
		String expression = switch (sort == null ? "loggedAt" : sort) {
			case "loggedAt" -> "log.logged_at";
			case "level" -> "CASE log.level WHEN 'ERROR' THEN 3 WHEN 'WARN' THEN 2 ELSE 1 END";
			case "source" -> "LOWER(log.log_source)";
			case "execution" -> "history.actual_fire_time";
			default -> throw ApplicationProblemException.invalidInput(
					"Ordenação de logs inválida", "Use loggedAt, level, source ou execution.");
		};
		return " ORDER BY " + expression + " " + safeDirection + ", log.logged_at DESC, log.id DESC";
	}

	private static String normalizeLogLevel(String level) {
		if (level == null || level.isBlank() || "ALL".equalsIgnoreCase(level)) return null;
		String normalized = level.toUpperCase(Locale.ROOT);
		if (!List.of("INFO", "WARN", "ERROR").contains(normalized)) {
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

	private record ExecutionLogFilter(String sql, List<Object> arguments) {
	}

	private record LogLevelCount(String level, long count) {
	}
}
