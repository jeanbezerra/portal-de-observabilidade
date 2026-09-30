package com.porto.ciops.coa.scheduler.api.administration.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
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
				.andExpect(jsonPath("$[?(@.id == 'calendar-sync')].jobClass")
						.value("br.com.porto.scheduler.jobs.CalendarSyncJob"));
	}

	@Test
	void shouldCreateAndDeleteCalendarEntry() throws Exception {
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

		mockMvc.perform(delete("/api/v1/calendars/CAL-integration-test"))
				.andExpect(status().isNoContent())
				.andExpect(content().string(""));
	}
}
