package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.administration.application.AdministrationCatalogService;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerRequest;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import jakarta.validation.Valid;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.zone.ZoneRulesException;
import java.util.Date;
import java.util.Locale;
import java.util.Set;
import java.util.StringTokenizer;
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

	private static final String MANAGED_HOLIDAY_CALENDAR_DESCRIPTION =
			AdministrationCatalogService.MANAGED_HOLIDAY_CALENDAR_DESCRIPTION;
	private static final String NO_CALENDAR = "Sem calendário de exclusão";
	private static final String IGNORE_MISFIRE_POLICY = "IGNORE_MISFIRE_POLICY";
	private static final String DO_NOTHING = "DO_NOTHING";
	private static final String FIRE_ONCE_NOW = "FIRE_ONCE_NOW";
	private static final String SMART_POLICY = "SMART_POLICY";
	private static final Set<String> SIMPLE_INTERVAL_UNITS = Set.of(
			"MILLISECOND", "MILLISECONDS", "SECOND", "SECONDS", "MINUTE", "MINUTES",
			"HOUR", "HOURS", "DAY", "DAYS");
	private static final Pattern CALENDAR_EXPRESSION = Pattern.compile(
			"(?i)^(\\d+)\\s+(SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR)S?$");
	private static final Pattern DAILY_EXPRESSION = Pattern.compile(
			"(?i)^(MON-FRI|SAT-SUN|EVERYDAY)\\s*[·|]\\s*"
					+ "(\\d{2}:\\d{2})-(\\d{2}:\\d{2})\\s*[·|]\\s*"
					+ "INTERVAL\\s+(\\d+)\\s+(SECOND|MINUTE|HOUR)S?$");

	private final Scheduler scheduler;
	private final AdministrationCatalogService catalogs;

	SchedulerTriggerFactory(Scheduler scheduler, AdministrationCatalogService catalogs) {
		this.scheduler = scheduler;
		this.catalogs = catalogs;
	}

	Trigger build(JobKey jobKey, @Valid TriggerRequest request) throws SchedulerException {
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

	private static CronScheduleBuilder cronSchedule(TriggerRequest request) {
		try {
			CronScheduleBuilder builder = CronScheduleBuilder.cronSchedule(request.expression())
					.inTimeZone(TimeZone.getTimeZone(ZoneId.of(request.timeZone())));
			return switch (request.misfireInstruction()) {
				case IGNORE_MISFIRE_POLICY -> builder.withMisfireHandlingInstructionIgnoreMisfires();
				case DO_NOTHING -> builder.withMisfireHandlingInstructionDoNothing();
				case FIRE_ONCE_NOW -> builder.withMisfireHandlingInstructionFireAndProceed();
				case SMART_POLICY -> builder;
				default -> throw invalidSchedule("Política de misfire inválida para CronTrigger.");
			};
		}
		catch (ApplicationProblemException exception) {
			throw exception;
		}
		catch (RuntimeException exception) {
			throw invalidSchedule("A expressão cron informada não é válida para o Quartz.", exception);
		}
	}

	private static SimpleScheduleBuilder simpleSchedule(TriggerRequest request) {
		SimpleExpression expression = parseSimpleExpression(request.expression());
		long amount = parsePositiveLong(expression.amount());
		String unit = expression.unit();
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
			throw invalidSchedule("O intervalo informado é maior que o limite suportado.", exception);
		}
		if (milliseconds <= 0) throw invalidSchedule("O intervalo precisa ser maior que zero.");
		SimpleScheduleBuilder builder = SimpleScheduleBuilder.simpleSchedule()
				.withIntervalInMilliseconds(milliseconds);
		String repeat = expression.repeat();
		builder = repeat == null || "FOREVER".equalsIgnoreCase(repeat)
				? builder.repeatForever() : builder.withRepeatCount(parseNonNegativeInt(repeat));
		return switch (request.misfireInstruction()) {
			case IGNORE_MISFIRE_POLICY -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case "FIRE_NOW" -> builder.withMisfireHandlingInstructionFireNow();
			case "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT" -> builder.withMisfireHandlingInstructionNowWithExistingCount();
			case "RESCHEDULE_NEXT_WITH_REMAINING_COUNT", "NEXT_WITH_REMAINING_COUNT" ->
					builder.withMisfireHandlingInstructionNextWithRemainingCount();
			case SMART_POLICY -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para SimpleTrigger.");
		};
	}

	private static SimpleExpression parseSimpleExpression(String rawExpression) {
		String expression = rawExpression.trim().toUpperCase(Locale.ROOT).replace('·', '|');
		int separator = expression.indexOf('|');
		if (separator != expression.lastIndexOf('|')) throw invalidSimpleExpression();
		String intervalPart = separator < 0 ? expression : expression.substring(0, separator);
		StringTokenizer intervalTokens = new StringTokenizer(intervalPart);
		if (intervalTokens.countTokens() != 3 || !"INTERVAL".equals(intervalTokens.nextToken())) {
			throw invalidSimpleExpression();
		}
		SimpleExpression interval = new SimpleExpression(intervalTokens.nextToken(), intervalTokens.nextToken(), null);
		if (!SIMPLE_INTERVAL_UNITS.contains(interval.unit())) throw invalidSimpleExpression();
		String repeatPart = separator < 0 ? "" : expression.substring(separator + 1);
		if (repeatPart.isBlank()) return interval;
		StringTokenizer repeatTokens = new StringTokenizer(repeatPart);
		if (repeatTokens.countTokens() != 2 || !"REPEAT".equals(repeatTokens.nextToken())) {
			throw invalidSimpleExpression();
		}
		return new SimpleExpression(interval.amount(), interval.unit(), repeatTokens.nextToken());
	}

	private static ApplicationProblemException invalidSimpleExpression() {
		return invalidSchedule("Use o formato INTERVAL 5 MINUTES · REPEAT FOREVER para SimpleTrigger.");
	}

	private static CalendarIntervalScheduleBuilder calendarIntervalSchedule(TriggerRequest request) {
		Matcher matcher = CALENDAR_EXPRESSION.matcher(request.expression().trim());
		if (!matcher.matches()) throw invalidSchedule("Use o formato 1 DAY para CalendarIntervalTrigger.");
		int amount = parsePositiveInt(matcher.group(1));
		IntervalUnit unit = IntervalUnit.valueOf(matcher.group(2).toUpperCase(Locale.ROOT));
		CalendarIntervalScheduleBuilder builder = CalendarIntervalScheduleBuilder.calendarIntervalSchedule()
				.withInterval(amount, unit)
				.inTimeZone(TimeZone.getTimeZone(ZoneId.of(request.timeZone())));
		return switch (request.misfireInstruction()) {
			case IGNORE_MISFIRE_POLICY -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case DO_NOTHING -> builder.withMisfireHandlingInstructionDoNothing();
			case FIRE_ONCE_NOW -> builder.withMisfireHandlingInstructionFireAndProceed();
			case SMART_POLICY -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para CalendarIntervalTrigger.");
		};
	}

	private static DailyTimeIntervalScheduleBuilder dailyTimeIntervalSchedule(TriggerRequest request) {
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
			case IGNORE_MISFIRE_POLICY -> builder.withMisfireHandlingInstructionIgnoreMisfires();
			case DO_NOTHING -> builder.withMisfireHandlingInstructionDoNothing();
			case FIRE_ONCE_NOW -> builder.withMisfireHandlingInstructionFireAndProceed();
			case SMART_POLICY -> builder;
			default -> throw invalidSchedule("Política de misfire inválida para DailyTimeIntervalTrigger.");
		};
	}

	private void ensureCalendarExists(String name) throws SchedulerException {
		if (scheduler.getCalendar(name) != null) return;
		HolidayCalendar calendar = new HolidayCalendar();
		calendar.setDescription(MANAGED_HOLIDAY_CALENDAR_DESCRIPTION);
		for (LocalDate date : catalogs.holidayDates()) {
			calendar.addExcludedDate(Date.from(date.atStartOfDay(ZoneId.systemDefault()).toInstant()));
		}
		scheduler.addCalendar(name, calendar, false, false);
	}

	private static void validateTimeZone(String timeZone) {
		try {
			ZoneId.of(timeZone);
		}
		catch (ZoneRulesException exception) {
			throw invalidSchedule("O fuso horário do trigger não é um identificador IANA válido.", exception);
		}
	}

	private static ApplicationProblemException invalidSchedule(String detail) {
		return ApplicationProblemException.invalidInput("Agendamento inválido", detail);
	}

	private static ApplicationProblemException invalidSchedule(String detail, Throwable cause) {
		return ApplicationProblemException.invalidInput("Agendamento inválido", detail, cause);
	}

	private static int parsePositiveInt(String value) {
		int parsed;
		try {
			parsed = Integer.parseInt(value);
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("O intervalo e a repetição precisam ser números inteiros positivos.", exception);
		}
		if (parsed <= 0) throw invalidSchedule("O intervalo e a repetição precisam ser números inteiros positivos.");
		return parsed;
	}

	private static long parsePositiveLong(String value) {
		long parsed;
		try {
			parsed = Long.parseLong(value);
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("O intervalo precisa ser um número inteiro positivo.", exception);
		}
		if (parsed <= 0) throw invalidSchedule("O intervalo precisa ser um número inteiro positivo.");
		return parsed;
	}

	private static int parseNonNegativeInt(String value) {
		int parsed;
		try {
			parsed = Integer.parseInt(value);
		}
		catch (NumberFormatException exception) {
			throw invalidSchedule("A repetição precisa ser um número inteiro não negativo.", exception);
		}
		if (parsed < 0) throw invalidSchedule("A repetição precisa ser um número inteiro não negativo.");
		return parsed;
	}

	private record SimpleExpression(String amount, String unit, String repeat) {
	}
}
