package com.porto.ciops.coa.obs.scheduler.administration.api;

import static com.porto.ciops.coa.obs.scheduler.administration.application.AdministrationCatalogService.MANAGED_HOLIDAY_CALENDAR_DESCRIPTION;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;
import org.quartz.Scheduler;
import org.quartz.impl.calendar.HolidayCalendar;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdministrationCatalogApiTests {

	@Autowired
	private MockMvc mockMvc;
	@Autowired
	private Scheduler scheduler;

	@Test
	void shouldExposeAdministrationCatalogs() throws Exception {
		mockMvc.perform(get("/api/v1/time-zones"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].isDefault", is(true)));

		mockMvc.perform(get("/api/v1/job-groups"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.key == 'plataforma')].name").value("Plataforma"));

		mockMvc.perform(get("/api/v1/job-types"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id", is("HTTP_REQUEST")))
				.andExpect(jsonPath("$[0].type", is("HTTP_REQUEST")));
	}

	@Test
	void shouldCreateAndDeleteCalendarEntry() throws Exception {
		String managedCalendarName = "integration-holidays";
		HolidayCalendar managedCalendar = new HolidayCalendar();
		managedCalendar.setDescription(MANAGED_HOLIDAY_CALENDAR_DESCRIPTION);
		scheduler.addCalendar(managedCalendarName, managedCalendar, false, false);
		String request = """
				{
				  "id": "CAL-integration-test",
				  "name": "Feriado de integração",
				  "date": "2027-01-02",
				  "type": "Feriado",
				  "scope": "Nacional",
				  "location": "",
				  "notes": "Criado pelo teste de integração"
				}
				""";

		mockMvc.perform(post("/api/v1/calendars")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id", is("CAL-integration-test")))
				.andExpect(jsonPath("$.date", is("2027-01-02")));
		long holiday = LocalDate.of(2027, 1, 2)
				.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();
		HolidayCalendar refreshedCalendar = (HolidayCalendar) scheduler.getCalendar(managedCalendarName);
		assertThat(refreshedCalendar.isTimeIncluded(holiday)).isFalse();

		mockMvc.perform(delete("/api/v1/calendars/CAL-integration-test"))
				.andExpect(status().isNoContent())
				.andExpect(content().string(""));
		refreshedCalendar = (HolidayCalendar) scheduler.getCalendar(managedCalendarName);
		assertThat(refreshedCalendar.isTimeIncluded(holiday)).isTrue();
		assertThat(scheduler.deleteCalendar(managedCalendarName)).isTrue();
	}
}
