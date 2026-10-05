package com.porto.ciops.coa.obs.scheduler.jobs.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.porto.ciops.coa.obs.scheduler.administration.application.AdministrationCatalogService;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.TriggerRequest;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.quartz.CalendarIntervalTrigger;
import org.quartz.CronTrigger;
import org.quartz.DailyTimeIntervalTrigger;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SimpleTrigger;
import org.quartz.Trigger;
import org.quartz.impl.calendar.HolidayCalendar;

class SchedulerTriggerFactoryTests {

	private static final JobKey JOB_KEY = JobKey.jobKey("health-check", "platform");

	@Test
	void shouldBuildEverySupportedTriggerType() throws Exception {
		SchedulerTriggerFactory factory = factory(mock(Scheduler.class), mock(AdministrationCatalogService.class));

		Trigger cron = factory.build(JOB_KEY, request(
				"cron", "CronTrigger", "0 0/5 * * * ?", "UTC", null, "SMART_POLICY"));
		Trigger simple = factory.build(JOB_KEY, request(
				"simple", "SimpleTrigger", "INTERVAL 5 MINUTES · REPEAT FOREVER", "UTC", null, "FIRE_NOW"));
		Trigger calendar = factory.build(JOB_KEY, request(
				"calendar", "CalendarIntervalTrigger", "1 DAY", "America/Sao_Paulo", null, "DO_NOTHING"));
		Trigger daily = factory.build(JOB_KEY, request(
				"daily", "DailyTimeIntervalTrigger", "MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
				"America/Sao_Paulo", null, "FIRE_ONCE_NOW"));

		assertThat(cron).isInstanceOf(CronTrigger.class).extracting(Trigger::getPriority).isEqualTo(5);
		assertThat(simple).isInstanceOf(SimpleTrigger.class);
		assertThat(((SimpleTrigger) simple).getRepeatInterval()).isEqualTo(300_000L);
		assertThat(calendar).isInstanceOf(CalendarIntervalTrigger.class);
		assertThat(daily).isInstanceOf(DailyTimeIntervalTrigger.class);
	}

	@Test
	void shouldCreateAReferencedManagedCalendarWhenItDoesNotExist() throws Exception {
		Scheduler scheduler = mock(Scheduler.class);
		AdministrationCatalogService catalogs = mock(AdministrationCatalogService.class);
		when(catalogs.holidayDates()).thenReturn(List.of(LocalDate.of(2026, 1, 1)));
		SchedulerTriggerFactory factory = factory(scheduler, catalogs);

		Trigger trigger = factory.build(JOB_KEY, request(
				"daily", "DailyTimeIntervalTrigger", "EVERYDAY · 08:00-18:00 · INTERVAL 1 HOUR",
				"UTC", " national-holidays ", "SMART_POLICY"));

		assertThat(trigger.getCalendarName()).isEqualTo("national-holidays");
		verify(scheduler).addCalendar(
				org.mockito.ArgumentMatchers.eq("national-holidays"),
				org.mockito.ArgumentMatchers.any(HolidayCalendar.class),
				org.mockito.ArgumentMatchers.eq(false),
				org.mockito.ArgumentMatchers.eq(false));
	}

	@Test
	void shouldReuseAReferencedCalendarWhenItAlreadyExists() throws Exception {
		Scheduler scheduler = mock(Scheduler.class);
		when(scheduler.getCalendar("national-holidays")).thenReturn(new HolidayCalendar());
		SchedulerTriggerFactory factory = factory(scheduler, mock(AdministrationCatalogService.class));

		Trigger trigger = factory.build(JOB_KEY, request(
				"daily", "DailyTimeIntervalTrigger", "EVERYDAY | 08:00-18:00 | INTERVAL 1 HOUR",
				"UTC", "national-holidays", "SMART_POLICY"));

		assertThat(trigger.getCalendarName()).isEqualTo("national-holidays");
		verify(scheduler, never()).addCalendar(
				org.mockito.ArgumentMatchers.anyString(),
				org.mockito.ArgumentMatchers.any(),
				org.mockito.ArgumentMatchers.anyBoolean(),
				org.mockito.ArgumentMatchers.anyBoolean());
	}

	@Test
	void shouldApplyEverySupportedMisfirePolicy() throws Exception {
		SchedulerTriggerFactory factory = factory(mock(Scheduler.class), mock(AdministrationCatalogService.class));

		for (String policy : List.of("IGNORE_MISFIRE_POLICY", "DO_NOTHING", "FIRE_ONCE_NOW", "SMART_POLICY")) {
			assertThat(factory.build(JOB_KEY, request(
					"cron-" + policy, "CronTrigger", "0 0/5 * * * ?", "UTC", null, policy)))
					.isInstanceOf(CronTrigger.class);
			assertThat(factory.build(JOB_KEY, request(
					"calendar-" + policy, "CalendarIntervalTrigger", "1 DAY", "UTC", null, policy)))
					.isInstanceOf(CalendarIntervalTrigger.class);
			assertThat(factory.build(JOB_KEY, request(
					"daily-" + policy, "DailyTimeIntervalTrigger",
					"SAT-SUN | 08:00-18:00 | INTERVAL 1 HOUR", "UTC", null, policy)))
					.isInstanceOf(DailyTimeIntervalTrigger.class);
		}

		for (String policy : List.of(
				"IGNORE_MISFIRE_POLICY", "FIRE_NOW", "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT",
				"RESCHEDULE_NEXT_WITH_REMAINING_COUNT", "NEXT_WITH_REMAINING_COUNT", "SMART_POLICY")) {
			assertThat(factory.build(JOB_KEY, request(
					"simple-" + policy, "SimpleTrigger", "INTERVAL 2 SECONDS | REPEAT 3", "UTC", null, policy)))
					.isInstanceOf(SimpleTrigger.class);
		}
	}

	@Test
	void shouldParseEverySimpleIntervalUnitAndOptionalRepeat() throws Exception {
		SchedulerTriggerFactory factory = factory(mock(Scheduler.class), mock(AdministrationCatalogService.class));
		List<String> expressions = List.of(
				"INTERVAL 2 MILLISECONDS",
				"INTERVAL 2 SECONDS",
				"INTERVAL 2 MINUTES",
				"INTERVAL 2 HOURS",
				"INTERVAL 2 DAYS");

		for (String expression : expressions) {
			assertThat(factory.build(JOB_KEY, request(
					"simple-" + expression, "SimpleTrigger", expression, "UTC", null, "SMART_POLICY")))
					.isInstanceOf(SimpleTrigger.class);
		}
	}

	@Test
	void shouldRejectInvalidPoliciesAndNumericLimits() {
		SchedulerTriggerFactory factory = factory(mock(Scheduler.class), mock(AdministrationCatalogService.class));
		List<TriggerRequest> invalidRequests = List.of(
				request("cron-policy", "CronTrigger", "0 0/5 * * * ?", "UTC", null, "INVALID"),
				request("cron-expression", "CronTrigger", "not-a-cron", "UTC", null, "SMART_POLICY"),
				request("simple-policy", "SimpleTrigger", "INTERVAL 1 SECOND", "UTC", null, "INVALID"),
				request("simple-zero", "SimpleTrigger", "INTERVAL 0 SECONDS", "UTC", null, "SMART_POLICY"),
				request("simple-overflow", "SimpleTrigger", "INTERVAL 9223372036854775807 DAYS", "UTC", null,
						"SMART_POLICY"),
				request("repeat-overflow", "SimpleTrigger", "INTERVAL 1 SECOND | REPEAT 2147483648", "UTC", null,
						"SMART_POLICY"),
				request("calendar-policy", "CalendarIntervalTrigger", "1 DAY", "UTC", null, "INVALID"),
				request("calendar-overflow", "CalendarIntervalTrigger", "2147483648 DAYS", "UTC", null,
						"SMART_POLICY"),
				request("daily-policy", "DailyTimeIntervalTrigger", "EVERYDAY | 08:00-18:00 | INTERVAL 1 HOUR",
						"UTC", null, "INVALID"),
				request("daily-zero", "DailyTimeIntervalTrigger", "EVERYDAY | 08:00-18:00 | INTERVAL 0 HOURS",
						"UTC", null, "SMART_POLICY"));

		for (TriggerRequest request : invalidRequests) {
			assertThatThrownBy(() -> factory.build(JOB_KEY, request))
					.isInstanceOf(ApplicationProblemException.class);
		}
	}

	@Test
	void shouldRejectInvalidScheduleInputs() {
		SchedulerTriggerFactory factory = factory(mock(Scheduler.class), mock(AdministrationCatalogService.class));
		List<TriggerRequest> invalidRequests = List.of(
				request("timezone", "CronTrigger", "0 0 * * * ?", "Invalid/Zone", null, "SMART_POLICY"),
				request("simple", "SimpleTrigger", "every five minutes", "UTC", null, "SMART_POLICY"),
				request("calendar", "CalendarIntervalTrigger", "0 DAY", "UTC", null, "SMART_POLICY"),
				request("daily", "DailyTimeIntervalTrigger", "EVERYDAY · 18:00-08:00 · INTERVAL 1 HOUR",
						"UTC", null, "SMART_POLICY"),
				request("unknown", "UnknownTrigger", "value", "UTC", null, "SMART_POLICY"));

		for (TriggerRequest request : invalidRequests) {
			assertThatThrownBy(() -> factory.build(JOB_KEY, request))
					.isInstanceOf(ApplicationProblemException.class)
					.hasMessageNotContaining("null");
		}
	}

	@Test
	void shouldNormalizeOptionalCalendarNames() {
		assertThat(SchedulerTriggerFactory.normalizeCalendar(null)).isNull();
		assertThat(SchedulerTriggerFactory.normalizeCalendar("  ")).isNull();
		assertThat(SchedulerTriggerFactory.normalizeCalendar("Sem calendário de exclusão")).isNull();
		assertThat(SchedulerTriggerFactory.normalizeCalendar(" holidays ")).isEqualTo("holidays");
	}

	private static SchedulerTriggerFactory factory(Scheduler scheduler, AdministrationCatalogService catalogs) {
		return new SchedulerTriggerFactory(scheduler, catalogs);
	}

	private static TriggerRequest request(
			String key, String type, String expression, String timeZone, String calendar, String misfire) {
		return new TriggerRequest(key, "platform", type, expression, timeZone, calendar, 5, misfire);
	}
}
