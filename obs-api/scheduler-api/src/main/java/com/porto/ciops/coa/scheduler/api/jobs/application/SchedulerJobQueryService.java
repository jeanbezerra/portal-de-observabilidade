package com.porto.ciops.coa.scheduler.api.jobs.application;

import com.porto.ciops.coa.scheduler.api.jobs.application.model.ActiveExecutionResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionHistoryResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.ExecutionSummaryResponse;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.JobDataEntryResponse;
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

	private final Scheduler scheduler;
	private final JdbcTemplate jdbc;

	public SchedulerJobQueryService(Scheduler scheduler, JdbcTemplate jdbc) {
		this.scheduler = scheduler;
		this.jdbc = jdbc;
	}

	public List<JobResponse> listJobs() throws SchedulerException {
		Map<JobKey, ActiveExecutionResponse> active = loadClusterActiveExecutions();
		for (JobExecutionContext context : scheduler.getCurrentlyExecutingJobs()) {
			active.put(context.getJobDetail().getKey(), toActiveExecution(context));
		}

		List<JobResponse> jobs = new ArrayList<>();
		for (JobKey key : scheduler.getJobKeys(GroupMatcher.anyJobGroup())) {
			jobs.add(toJobResponse(scheduler.getJobDetail(key), active.get(key)));
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
		return toJobResponse(detail, active);
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

	List<JobDataEntryResponse> loadJobData(JobKey key, boolean maskSensitive) {
		List<JobDataEntryResponse> entries = jdbc.query("""
				SELECT data_key, data_type, data_value, sensitive
				FROM public.scheduler_job_data
				WHERE job_group = ? AND job_name = ?
				ORDER BY data_key
				""", (resultSet, rowNumber) -> {
			boolean sensitive = resultSet.getBoolean("sensitive");
			String value = maskSensitive && sensitive ? "••••••••" : resultSet.getString("data_value");
			return new JobDataEntryResponse(resultSet.getString("data_key"), resultSet.getString("data_type"), value, sensitive);
		}, key.getGroup(), key.getName());
		if (!entries.isEmpty()) return entries;
		try {
			JobDetail detail = scheduler.getJobDetail(key);
			if (detail == null) return List.of();
			return detail.getJobDataMap().entrySet().stream()
					.filter(entry -> !entry.getKey().startsWith("_"))
					.map(entry -> new JobDataEntryResponse(entry.getKey(), "String", String.valueOf(entry.getValue()), false))
					.sorted(Comparator.comparing(JobDataEntryResponse::key)).toList();
		}
		catch (SchedulerException exception) {
			throw new IllegalStateException(exception);
		}
	}

	TriggerResponse getTrigger(TriggerKey key) throws SchedulerException {
		Trigger trigger = scheduler.getTrigger(key);
		if (trigger == null) {
			throw ApplicationProblemException.notFound("Agendamento não encontrado",
					"O trigger solicitado não existe.");
		}
		return toTriggerResponse(trigger, loadTriggerMetadata(key));
	}

	private JobResponse toJobResponse(JobDetail detail, ActiveExecutionResponse activeExecution) throws SchedulerException {
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
		String logicalClass = metadata == null
				? detail.getJobDataMap().getString("_logicalJobClass") : metadata.logicalJobClass();
		if (logicalClass == null || logicalClass.isBlank()) logicalClass = detail.getJobClass().getName();

		return new JobResponse(
				key.getGroup() + "." + key.getName(), key.getName(), key.getGroup(),
				metadata == null ? nullToEmpty(detail.getDescription()) : metadata.description(), logicalClass,
				detail.isDurable(), detail.requestsRecovery(), disallowConcurrent, persistJobData, interruptable,
				triggers, activeExecution, loadLastExecution(key), loadJobData(key, true));
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

	private JobMetadata loadJobMetadata(JobKey key) {
		List<JobMetadata> rows = jdbc.query("""
				SELECT description, logical_job_class, disallow_concurrent, persist_job_data, interruptable
				FROM public.scheduler_job_metadata WHERE job_group = ? AND job_name = ?
				""", (resultSet, rowNumber) -> new JobMetadata(
				resultSet.getString("description"), resultSet.getString("logical_job_class"),
				resultSet.getBoolean("disallow_concurrent"), resultSet.getBoolean("persist_job_data"),
				resultSet.getBoolean("interruptable")), key.getGroup(), key.getName());
		return rows.isEmpty() ? null : rows.getFirst();
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

	private record JobMetadata(
			String description,
			String logicalJobClass,
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
}
