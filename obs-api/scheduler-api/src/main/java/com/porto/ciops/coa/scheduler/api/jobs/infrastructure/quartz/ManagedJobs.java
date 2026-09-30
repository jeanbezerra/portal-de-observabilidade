package com.porto.ciops.coa.scheduler.api.jobs.infrastructure.quartz;

import java.util.concurrent.atomic.AtomicBoolean;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.InterruptableJob;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.PersistJobDataAfterExecution;
import org.quartz.UnableToInterruptJobException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class ManagedJobs {

	private ManagedJobs() {
	}

	public static class ManagedJob implements InterruptableJob {

		private static final Logger LOGGER = LoggerFactory.getLogger(ManagedJob.class);
		private final AtomicBoolean interruptionRequested = new AtomicBoolean();

		@Override
		public void execute(JobExecutionContext context) throws JobExecutionException {
			String logicalClass = context.getMergedJobDataMap().getString("_logicalJobClass");
			LOGGER.info("Execução administrativa da rotina {}.{} ({})",
					context.getJobDetail().getKey().getGroup(), context.getJobDetail().getKey().getName(), logicalClass);
			if (interruptionRequested.get() || Thread.currentThread().isInterrupted()) {
				throw new JobExecutionException("Execução interrompida antes do processamento.");
			}
		}

		@Override
		public void interrupt() throws UnableToInterruptJobException {
			interruptionRequested.set(true);
		}
	}

	@DisallowConcurrentExecution
	public static class NonConcurrentManagedJob extends ManagedJob {
	}

	@PersistJobDataAfterExecution
	public static class PersistentManagedJob extends ManagedJob {
	}

	@DisallowConcurrentExecution
	@PersistJobDataAfterExecution
	public static class NonConcurrentPersistentManagedJob extends ManagedJob {
	}
}
