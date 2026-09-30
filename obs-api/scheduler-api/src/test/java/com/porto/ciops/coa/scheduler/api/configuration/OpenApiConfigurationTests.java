package com.porto.ciops.coa.scheduler.api.configuration;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
class OpenApiConfigurationTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void shouldExposeSwaggerAtApplicationRoot() throws Exception {
		mockMvc.perform(get("/"))
				.andExpect(status().is3xxRedirection())
				.andExpect(header().string("Location", "/swagger-ui/index.html"));
	}

	@Test
	void shouldExposeOpenApiDescription() throws Exception {
		mockMvc.perform(get("/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.info.title", is("Scheduler API")))
				.andExpect(jsonPath("$.info.description", is("API administrativa para gestão do Quartz Scheduler.")))
				.andExpect(jsonPath("$.info.version", is("v1")))
				.andExpect(jsonPath("$.info.contact.name", is("CIOPS - COA")));
	}
}
