package com.porto.ciops.coa.obs.scheduler.jobs.application;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ExecutionLogRecorder {

	private static final Logger LOGGER = LoggerFactory.getLogger(ExecutionLogRecorder.class);
	private static final int MAX_MESSAGE_LENGTH = 1_000;
	private static final int MAX_DETAILS_LENGTH = 20_000;
	private static final int MAX_CAUSE_DEPTH = 8;
	private static final int MAX_STACK_FRAMES = 50;
	private static final Pattern URL_QUERY = Pattern.compile("(?i)(https?://[^\\s?#]+)\\?[^\\s#]*");
	private static final Pattern SENSITIVE_VALUE = Pattern.compile(
			"(?im)(authorization|cookie|set-cookie|api[-_ ]?key|token|secret|password)(\\s*[:=]\\s*)[^\\r\\n]+");

	private final JdbcTemplate jdbc;

	public ExecutionLogRecorder(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public void info(String fireInstanceId, String source, String message) {
		persist(fireInstanceId, "INFO", source, message, null);
	}

	public void info(String fireInstanceId, String source, String message, String details) {
		persist(fireInstanceId, "INFO", source, message, details);
	}

	public void warn(String fireInstanceId, String source, String message, String details) {
		persist(fireInstanceId, "WARN", source, message, details);
	}

	public void error(String fireInstanceId, String source, String message, Throwable failure) {
		persist(fireInstanceId, "ERROR", source, message, stackTrace(failure));
	}

	private void persist(String fireInstanceId, String level, String source, String message, String details) {
		try {
			jdbc.update("""
					INSERT INTO public.scheduler_execution_log (
					    fire_instance_id, logged_at, level, log_source, message, details
					) VALUES (?, ?, ?, ?, ?, ?)
					""", fireInstanceId, Timestamp.from(Instant.now()), level,
					truncate(source, 80), truncate(redact(message), MAX_MESSAGE_LENGTH),
					truncate(redact(details), MAX_DETAILS_LENGTH));
		}
		catch (RuntimeException exception) {
			LOGGER.warn("Não foi possível persistir um log da execução {}.", fireInstanceId, exception);
		}
	}

	private static String stackTrace(Throwable failure) {
		if (failure == null) return null;
		StringBuilder output = new StringBuilder();
		Throwable current = failure;
		int causeDepth = 0;
		int stackFrames = 0;
		while (current != null && causeDepth < MAX_CAUSE_DEPTH && stackFrames < MAX_STACK_FRAMES) {
			if (causeDepth > 0) {
				output.append("Caused by: ");
			}
			output.append(current.getClass().getName()).append(System.lineSeparator());
			for (StackTraceElement element : current.getStackTrace()) {
				if (stackFrames >= MAX_STACK_FRAMES) {
					break;
				}
				output.append("\tat ").append(element).append(System.lineSeparator());
				stackFrames++;
			}
			current = current.getCause();
			causeDepth++;
		}
		return output.toString();
	}

	private static String truncate(String value, int limit) {
		if (value == null || value.length() <= limit) return value;
		return value.substring(0, limit);
	}

	private static String redact(String value) {
		if (value == null) return null;
		String withoutQueryValues = URL_QUERY.matcher(value).replaceAll("$1?[omitido]");
		return SENSITIVE_VALUE.matcher(withoutQueryValues).replaceAll("$1$2[omitido]");
	}
}
