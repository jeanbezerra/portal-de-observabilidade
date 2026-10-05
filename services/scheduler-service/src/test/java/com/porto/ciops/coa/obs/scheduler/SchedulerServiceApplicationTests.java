package com.porto.ciops.coa.obs.scheduler;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class SchedulerServiceApplicationTests {

	@Test
	void contextLoads(@Autowired ApplicationContext context) {
		assertThat(context).isNotNull();
	}
}
