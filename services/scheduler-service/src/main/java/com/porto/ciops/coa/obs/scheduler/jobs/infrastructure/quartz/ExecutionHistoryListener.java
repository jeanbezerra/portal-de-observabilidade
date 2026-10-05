package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.quartz;

import com.porto.ciops.coa.obs.scheduler.jobs.application.ExecutionLogRecorder;
import java.sql.Timestamp;
import java.time.Instant;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.JobListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class ExecutionHistoryListener implements JobListener {

	private final JdbcTemplate jdbc;
	private final ExecutionLogRecorder executionLogs;

	public ExecutionHistoryListener(JdbcTemplate jdbc, ExecutionLogRecorder executionLogs) {
		this.jdbc = jdbc;
		this.executionLogs = executionLogs;
	}

	@Override
	public String getName() {
		return "scheduler-execution-history";
	}

	@Override
	public void jobToBeExecuted(JobExecutionContext context) {
		jdbc.update("""
				INSERT INTO public.scheduler_execution_history (
				    fire_instance_id, job_name, job_group, trigger_name, trigger_group,
				    scheduler_instance, scheduled_fire_time, actual_fire_time, finished_at,
				    duration_ms, result, message, refire_count, recovering, interruption_requested
				) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'RUNNING', ?, ?, ?, false)
				""",
				context.getFireInstanceId(), context.getJobDetail().getKey().getName(),
				context.getJobDetail().getKey().getGroup(), context.getTrigger().getKey().getName(),
				context.getTrigger().getKey().getGroup(), schedulerInstance(context),
				timestamp(context.getScheduledFireTime() == null ? null : context.getScheduledFireTime().toInstant()),
				timestamp(context.getFireTime().toInstant()), "Execução iniciada.",
				context.getRefireCount(), context.isRecovering());
		executionLogs.info(context.getFireInstanceId(), "quartz", "Execução iniciada.", """
				Job: %s
				Trigger: %s
				Instância: %s
				Refire count: %d
				Recuperação: %s
				""".formatted(context.getJobDetail().getKey(), context.getTrigger().getKey(),
				schedulerInstance(context), context.getRefireCount(), context.isRecovering()).strip());
	}

	@Override
	public void jobExecutionVetoed(JobExecutionContext context) {
		jdbc.update("""
				UPDATE public.scheduler_execution_history
				SET finished_at = ?, duration_ms = 0, result = 'FAILED', message = ?
				WHERE fire_instance_id = ?
				""", timestamp(Instant.now()), "Execução vetada por um listener do scheduler.", context.getFireInstanceId());
		executionLogs.warn(context.getFireInstanceId(), "quartz",
				"Execução vetada por um listener do scheduler.", null);
	}

	@Override
	public void jobWasExecuted(JobExecutionContext context, JobExecutionException jobException) {
		String result = jobException != null ? "FAILED" : context.isRecovering() ? "RECOVERED" : "SUCCESS";
		String message = jobException != null
				? safeMessage(jobException)
				: successMessage(context);
		jdbc.update("""
				UPDATE public.scheduler_execution_history
				SET finished_at = ?, duration_ms = ?, result = ?, message = ?
				WHERE fire_instance_id = ?
				""", timestamp(Instant.now()), context.getJobRunTime(), result, message, context.getFireInstanceId());
		if (jobException != null) {
			executionLogs.error(context.getFireInstanceId(), "quartz", message, jobException);
		}
		else {
			executionLogs.info(context.getFireInstanceId(), "quartz", message,
					"Duração: " + context.getJobRunTime() + " ms");
		}
	}

	private static String successMessage(JobExecutionContext context) {
		if (context.isRecovering()) return "Execução recuperada e concluída.";
		Object executionResult = context.getResult();
		if (executionResult == null || executionResult.toString().isBlank()) return "Execução concluída com sucesso.";
		String message = executionResult.toString();
		return message.length() > 1000 ? message.substring(0, 1000) : message;
	}

	private static String schedulerInstance(JobExecutionContext context) {
		try {
			return context.getScheduler().getSchedulerInstanceId();
		}
		catch (org.quartz.SchedulerException exception) {
			return "unknown";
		}
	}

	private static String safeMessage(JobExecutionException exception) {
		String message = exception.getMessage();
		if (message == null || message.isBlank()) {
			message = exception.getClass().getSimpleName();
		}
		return message.length() > 1000 ? message.substring(0, 1000) : message;
	}

	private static Timestamp timestamp(Instant value) {
		return value == null ? null : Timestamp.from(value);
	}
}
