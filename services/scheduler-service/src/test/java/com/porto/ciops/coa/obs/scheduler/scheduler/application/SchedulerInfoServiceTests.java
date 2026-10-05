package com.porto.ciops.coa.obs.scheduler.scheduler.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.quartz.Scheduler;
import org.quartz.SchedulerMetaData;

class SchedulerInfoServiceTests {

	@Test
	void shouldReportShutdownState() throws Exception {
		Scheduler scheduler = schedulerWithMetadata();
		when(scheduler.isShutdown()).thenReturn(true);

		assertThat(new SchedulerInfoService(scheduler).getSchedulerInfo().state()).isEqualTo("SHUTDOWN");
	}

	@Test
	void shouldReportStandbyState() throws Exception {
		Scheduler scheduler = schedulerWithMetadata();
		when(scheduler.isInStandbyMode()).thenReturn(true);

		assertThat(new SchedulerInfoService(scheduler).getSchedulerInfo().state()).isEqualTo("STANDBY");
	}

	@Test
	void shouldReportRunningState() throws Exception {
		Scheduler scheduler = schedulerWithMetadata();
		when(scheduler.isStarted()).thenReturn(true);

		assertThat(new SchedulerInfoService(scheduler).getSchedulerInfo().state()).isEqualTo("RUNNING");
	}

	@Test
	void shouldReportStartingState() throws Exception {
		Scheduler scheduler = schedulerWithMetadata();

		assertThat(new SchedulerInfoService(scheduler).getSchedulerInfo().state()).isEqualTo("STARTING");
	}

	private static Scheduler schedulerWithMetadata() throws Exception {
		Scheduler scheduler = mock(Scheduler.class);
		SchedulerMetaData metadata = mock(SchedulerMetaData.class);
		when(metadata.getRunningSince()).thenReturn(Timestamp.from(Instant.EPOCH));
		when(scheduler.getMetaData()).thenReturn(metadata);
		return scheduler;
	}
}
