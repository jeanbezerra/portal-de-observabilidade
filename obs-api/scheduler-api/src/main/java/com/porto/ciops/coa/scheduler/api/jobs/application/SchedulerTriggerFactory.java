package com.porto.ciops.coa.scheduler.api.jobs.application;

import static com.porto.ciops.coa.scheduler.api.administration.application.AdministrationCatalogService.MANAGED_HOLIDAY_CALENDAR_DESCRIPTION;

import com.porto.ciops.coa.scheduler.api.administration.application.AdministrationCatalogService;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.TriggerRequest;
import com.porto.ciops.coa.scheduler.api.support.ApplicationProblemException;
import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.zone.ZoneRulesException;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.quartz.CalendarIntervalScheduleBuilder;
import org.quartz.CronScheduleBuilder;
import org.quartz.DailyTimeIntervalScheduleBuilder;
import org.quartz.DateBuilder.IntervalUnit;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.TimeOfDay;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.quartz.impl.calendar.HolidayCalendar;
import org.springframework.stereotype.Component;

@Component
class SchedulerTriggerFactory {

	private static final String NO_CALENDAR = "Sem calendário de exclusão";
	private static final Pattern SIMPLE_EXPRESSION = Pattern.compile(
			"(?i)^INTERVAL\\s+(\\d+)\\s+(MILLISECONDS?|SECONDS?|MINUTES?|HOURS?|DAYS?)(?:\\s*[·|]\\s*REPEAT\\s+(FOREVER|\\d+))?$");
	private static final Pattern CALENDAR_EXPRESSION = Pattern.compile(
			"(?i)^(\\d+)\\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)S?$");
	private static final Pattern DAILY_EXPRESSION = Pattern.compile(
			"(?i)^(MON-FRI|SAT-SUN|EVERYDAY)\\s*[·|]\\s*(\\d{2}:\\d{2})-(\\d{2}:\\d{2})\\s*[·|]\\s*INTERVAL\\s+(\\d+)\\s+(SECOND|MINUTE|HOUR)S?$");

	private final Scheduler scheduler;
	private final AdministrationCatalogService catalogs;

	SchedulerTriggerFactory(Scheduler scheduler, AdministrationCatalogService catalogs) {
		this.scheduler = scheduler;
		this.catalogs = catalogs;
	}

	Trigger build(JobKey jobKey, TriggerRequest request) throws SchedulerException {
		validateTimeZone(request.timeZone());
		TriggerBuilder<Trigger> builder = TriggerBuilder.newTrigger()
				.withIdentity(request.key(), request.group())
				.forJob(jobKey)
				.startNow()
				.withPriority(request.priority());
		String calendar = normalizeCalendar(request.calendar());
		if (calendar != null) {
			ensureCalendarExists(calendar);
			builder.modifiedByCalendar(calendar);
		}

		return switch (request.type()) {
			case "CronTrigger" -> builder.withSchedule(cronSchedule(request)).build();
			case "SimpleTrigger" -> builder.withSchedule(simpleSchedule(request)).build();
			case "CalendarIntervalTrigger" -> builder.withSchedule(calendarIntervalSchedule(request)).build();
			case "DailyTimeIntervalTrigger" -> builder.withSchedule(dailyTimeIntervalSchedule(request)).build();
			default -> throw invalidSchedule("Tipo de trigger não suportado.");
		};
	}

	static String normalizeCalendar(String calendar) {
		if (calendar == null || calendar.isBlank() || NO_CALENDAR.equalsIgnoreCase(calendar.trim())) return null;
		return calendar.trim();
	}

	private CronScheduleBuilder cronSchedule(TriggerRequest request) {
		try {
			CronScheduleBuilder builder = CronScheduleBuilder.cronSchedule(request.expression())
					.inTimeZone(TimeZone.getTimeZone(ZoneId.of(request.timeZone())));
			return switch (request.misfireInstruction()) {
				case "IGNORE_MISFIRE_POLICY" -> builder.withMisfireHandlingInstructionIgnoreMisfires();
				case "DO_NOTHING" -> builder.withMisfireHandlingInstructionDoNothing();
				case "FIRE_ONCE_NOW" -> builder.withMisfireHandlingInstructionFireAndProceed();
				case "SMART_POLICY" -> builder;
				default -> throw invalidSchedule("Política de misfire inválida para CronTrigger.");
			};
		}
		catch (RuntimeException exception) {
			if (exception instanceof ApplicationProblemException problem) throw problem;
			throw invalidSchedule("A expressão cron informada não é válida para o Quartz.");
		}
	}

	private SimpleScheduleBuilder simpleSchedule(TriggerRequest request) {
		Matcher matcher = SIMPLE_EXPRESSION.matcher(request.expression().trim());
		if (!matcher.matches()) {
			throw invalidSchedule("Use o formato INTERVAL 5 MINUTES · REPEAT FOREVER para SimpleTrigger.");
		}
		long amount = parsePositiveLong(matcher.group(1));
		String unit = matcher.group(2).toUpperCase(Locale.ROOT);
		long milliseconds;
		try {
			milliseconds = switch (unit.charAt(0)) {
				case 'M' -> unit.startsWith("MILLI") ? amount : Duration.ofMinutes(amount).toMillis();
				case 'S' -> Duration.ofSeconds(amount).toMillis();
				case 'H' -> Duration.ofHours(amount).toMillis();
				case 'D' -> Duration.ofDays(amount).toMillis();
				default -> throw invalidSchedule("Unidade de intervalo inválida para SimpleTrigger.");
			};
		}
		catch (ArithmeticException exception) {
			throw invalidSchedule("O intervalo informado é maior que o limite suportado.");
		}
		if (milliseconds <= 0) throw invalidSchedule("O intervalo precisa ser maior que zero.");
		SimpleScheduleBuilder builder = SimpleScheduleBuilder.simpleSchedule().withIntervalInMilliseconds(milliseconds);
		String repeat = matcher.group(3);
		builder = repeat == null || "FOREVER".equalsIgnoreCase(repeat)
				? builder.repeatForever() : builder.withRepeatCount(parseNonNegativeInt(repeat));
		return switch (request.misfireInstruction()) {
			case "IGNORE_MISFIRE_POLICY" -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case "FIRE_NOW" -> builder.withMisfireHandlingInstructionFireNow();
			case "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT" -> builder.withMisfireHandlingInstructionNowWithExistingCount();
			case "RESCHEDULE_NEXT_WITH_REMAINING_COUNT", "NEXT_WITH_REMAINING_COUNT" -> builder.withMisfireHandlingInstructionNextWithRemainingCount();
			case "SMART_POLICY" -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para SimpleTrigger.");
		};
	}

	private CalendarIntervalScheduleBuilder calendarIntervalSchedule(TriggerRequest request) {
		Matcher matcher = CALENDAR_EXPRESSION.matcher(request.expression().trim());
		if (!matcher.matches()) throw invalidSchedule("Use o formato 1 DAY para CalendarIntervalTrigger.");
		int amount = parsePositiveInt(matcher.group(1));
		IntervalUnit unit = IntervalUnit.valueOf(matcher.group(2).toUpperCase(Locale.ROOT));
		CalendarIntervalScheduleBuilder builder = CalendarIntervalScheduleBuilder.calendarIntervalSchedule()
				.withInterval(amount, unit)
				.inTimeZone(TimeZone.getTimeZone(ZoneId.of(request.timeZone())));
		return switch (request.misfireInstruction()) {
			case "IGNORE_MISFIRE_POLICY" -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case "DO_NOTHING" -> builder.withMisfireHandlingInstructionDoNothing();
			case "FIRE_ONCE_NOW" -> builder.withMisfireHandlingInstructionFireAndProceed();
			case "SMART_POLICY" -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para CalendarIntervalTrigger.");
		};
	}

	private DailyTimeIntervalScheduleBuilder dailyTimeIntervalSchedule(TriggerRequest request) {
		Matcher matcher = DAILY_EXPRESSION.matcher(request.expression().trim());
		if (!matcher.matches()) {
			throw invalidSchedule("Use o formato MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES para DailyTimeIntervalTrigger.");
		}
		LocalTime start = LocalTime.parse(matcher.group(2));
		LocalTime end = LocalTime.parse(matcher.group(3));
		if (!end.isAfter(start)) throw invalidSchedule("O fim da janela diária precisa ocorrer depois do início.");
		int amount = parsePositiveInt(matcher.group(4));
		IntervalUnit unit = IntervalUnit.valueOf(matcher.group(5).toUpperCase(Locale.ROOT));
		DailyTimeIntervalScheduleBuilder builder = DailyTimeIntervalScheduleBuilder.dailyTimeIntervalSchedule()
				.withInterval(amount, unit)
				.startingDailyAt(new TimeOfDay(start.getHour(), start.getMinute()))
				.endingDailyAt(new TimeOfDay(end.getHour(), end.getMinute()));
		builder = switch (matcher.group(1).toUpperCase(Locale.ROOT)) {
			case "MON-FRI" -> builder.onMondayThroughFriday();
			case "SAT-SUN" -> builder.onSaturdayAndSunday();
			case "EVERYDAY" -> builder.onEveryDay();
			default -> throw invalidSchedule("Dias inválidos para DailyTimeIntervalTrigger.");
		};
		return switch (request.misfireInstruction()) {
			case "IGNORE_MISFIRE_POLICY" -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case "DO_NOTHING" -> builder.withMisfireHandlingInstructionDoNothing();
			case "FIRE_ONCE_NOW" -> builder.withMisfireHandlingInstructionFireAndProceed();
			case "SMART_POLICY" -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para DailyTimeIntervalTrigger.");
		};
	}

	private void ensureCalendarExists(String name) throws SchedulerException {
		if (scheduler.getCalendar(name) != null) return;
		HolidayCalendar calendar = new HolidayCalendar();
		calendar.setDescription(MANAGED_HOLIDAY_CALENDAR_DESCRIPTION);
		for (java.time.LocalDate date : catalogs.holidayDates()) {
			calendar.addExcludedDate(Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant()));
		}
		scheduler.addCalendar(name, calendar, false, false);
	}

	private static void validateTimeZone(String timeZone) {
		try {
			ZoneId.of(timeZone);
		}
		catch (ZoneRulesException exception) {
			throw invalidSchedule("O fuso horário do trigger não é um identificador IANA válido.");
		}
	}

	private static ApplicationProblemException invalidSchedule(String detail) {
		return ApplicationProblemException.invalidInput("Agendamento inválido", detail);
	}

	private static int parsePositiveInt(String value) {
		try {
			int parsed = Integer.parseInt(value);
			if (parsed <= 0) throw new NumberFormatException();
			return parsed;
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("O intervalo e a repetição precisam ser números inteiros positivos.");
		}
	}

	private static long parsePositiveLong(String value) {
		try {
			long parsed = Long.parseLong(value);
			if (parsed <= 0) throw new NumberFormatException();
			return parsed;
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("O intervalo precisa ser um número inteiro positivo.");
		}
	}

	private static int parseNonNegativeInt(String value) {
		try {
			int parsed = Integer.parseInt(value);
			if (parsed < 0) throw new NumberFormatException();
			return parsed;
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("A repetição precisa ser um número inteiro não negativo.");
		}
	}
}
