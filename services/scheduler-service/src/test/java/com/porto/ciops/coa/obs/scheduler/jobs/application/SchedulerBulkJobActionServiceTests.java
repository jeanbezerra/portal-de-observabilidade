package com.porto.ciops.coa.obs.scheduler.jobs.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobActionResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobKeyRequest;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.quartz.SchedulerException;

class SchedulerBulkJobActionServiceTests {

	@Test
	void shouldExecuteEverySupportedActionThroughTheTransactionalJobService() throws Exception {
		SchedulerJobService jobs = mock(SchedulerJobService.class);
		SchedulerBulkJobActionService service = new SchedulerBulkJobActionService(jobs);
		BulkJobKeyRequest key = new BulkJobKeyRequest("platform", "health-check");

		assertThat(service.execute(List.of(key), "pause").succeeded()).isEqualTo(1);
		assertThat(service.execute(List.of(key), "trigger").succeeded()).isEqualTo(1);
		assertThat(service.execute(List.of(key), "interrupt").succeeded()).isEqualTo(1);
		verify(jobs).pauseJob("platform", "health-check");
		verify(jobs).triggerJob("platform", "health-check");
		verify(jobs).interruptJob("platform", "health-check");
	}

	@Test
	void shouldContinueTheBatchAndReportJobsThatFail() throws Exception {
		SchedulerJobService jobs = mock(SchedulerJobService.class);
		SchedulerBulkJobActionService service = new SchedulerBulkJobActionService(jobs);
		BulkJobKeyRequest successful = new BulkJobKeyRequest("platform", "successful");
		BulkJobKeyRequest failed = new BulkJobKeyRequest("platform", "failed");
		doThrow(new SchedulerException("scheduler unavailable"))
				.when(jobs).pauseJob("platform", "failed");

		BulkJobActionResponse response = service.execute(List.of(successful, failed), "pause");

		assertThat(response.requested()).isEqualTo(2);
		assertThat(response.succeeded()).isEqualTo(1);
		assertThat(response.skipped()).containsExactly("platform.failed");
	}

	@Test
	void shouldRejectUnsupportedBatchActionBeforeCallingQuartz() {
		SchedulerBulkJobActionService service = new SchedulerBulkJobActionService(mock(SchedulerJobService.class));
		List<BulkJobKeyRequest> jobs = List.of(new BulkJobKeyRequest("platform", "health-check"));

		assertThatThrownBy(() -> service.execute(jobs, "delete"))
				.isInstanceOf(ApplicationProblemException.class)
				.hasMessage("Use pause, trigger ou interrupt.");
	}
}
