package com.porto.ciops.coa.scheduler.api.scheduler.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SchedulerInfoApiTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void shouldExposeSchedulerStatus() throws Exception {
		mockMvc.perform(get("/api/v1/scheduler"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.schedulerName", is("obs-scheduler-test")))
				.andExpect(jsonPath("$.state", is("RUNNING")));
	}
}
