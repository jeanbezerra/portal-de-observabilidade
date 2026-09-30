package com.porto.ciops.coa.scheduler.api.jobs.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class SchedulerJobApiTests {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void shouldTranslateApplicationProblemToHttpProblemDetail() throws Exception {
		String request = """
				{
				  "name": "rotina-sem-trigger",
				  "group": "plataforma",
				  "description": "Rotina inválida para testar a fronteira HTTP.",
				  "jobClass": "br.com.porto.scheduler.jobs.CalendarSyncJob",
				  "durable": false,
				  "requestsRecovery": false,
				  "disallowConcurrent": false,
				  "persistJobData": false,
				  "interruptable": false,
				  "jobData": [],
				  "triggers": []
				}
				""";

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title", is("Rotina não durável sem trigger")));
	}

	@Test
	void shouldManageQuartzJobThroughApi() throws Exception {
		String request = """
				{
				  "name": "rotina-integration-test",
				  "group": "plataforma",
				  "description": "Rotina criada pelo teste de integração.",
				  "jobClass": "br.com.porto.scheduler.jobs.CalendarSyncJob",
				  "durable": true,
				  "requestsRecovery": false,
				  "disallowConcurrent": true,
				  "persistJobData": false,
				  "interruptable": false,
				  "jobData": [{"key":"origem","type":"String","value":"teste","sensitive":false}],
				  "triggers": [{
				    "key": "rotina-integration-test-trigger",
				    "group": "plataforma",
				    "type": "CronTrigger",
				    "expression": "0 0 8 ? * MON-FRI",
				    "timeZone": "America/Sao_Paulo",
				    "calendar": "feriados-nacionais-br",
				    "priority": 5,
				    "misfireInstruction": "SMART_POLICY"
				  }]
				}
				""";

		mockMvc.perform(post("/api/v1/jobs")
					.contentType(MediaType.APPLICATION_JSON)
					.content(request))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id", is("plataforma.rotina-integration-test")))
				.andExpect(jsonPath("$.jobClass", is("br.com.porto.scheduler.jobs.CalendarSyncJob")))
				.andExpect(jsonPath("$.jobData[0].value", is("teste")))
				.andExpect(jsonPath("$.triggers[0].type", is("CronTrigger")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/pause"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.triggers[0].state", is("PAUSED")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/resume"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.triggers[0].state", is("NORMAL")));

		mockMvc.perform(post("/api/v1/jobs/plataforma/rotina-integration-test/trigger"))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/v1/jobs/plataforma/rotina-integration-test"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.durable", is(true)));

		mockMvc.perform(delete("/api/v1/jobs/plataforma/rotina-integration-test"))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/v1/executions"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[?(@.jobName == 'rotina-integration-test')].result")
						.value("SUCCESS"));
	}
}
