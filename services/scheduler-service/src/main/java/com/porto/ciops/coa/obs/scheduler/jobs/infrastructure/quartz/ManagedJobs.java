package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.quartz;

import java.util.concurrent.atomic.AtomicBoolean;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.InterruptableJob;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.PersistJobDataAfterExecution;
import org.quartz.UnableToInterruptJobException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Compatibility-only job classes for definitions persisted before HTTP_REQUEST.
 * They are not exposed by the catalog and no new job can be created with them.
 *
 * @deprecated retained only so Quartz can deserialize legacy persisted job class names
 */
@Deprecated(forRemoval = true)
@SuppressWarnings({"java:S1133", "PMD.MissingStaticMethodInNonInstantiatableClass"})
public final class ManagedJobs {

	private ManagedJobs() {
	}

	public static class ManagedJob implements InterruptableJob {

		private static final Logger LOGGER = LoggerFactory.getLogger(ManagedJob.class);
		private final AtomicBoolean interruptionRequested = new AtomicBoolean();

		@Override
		public void execute(JobExecutionContext context) throws JobExecutionException {
			LOGGER.warn("A rotina legada {}.{} não possui executor e deve ser removida ou recriada como HTTP_REQUEST.",
					context.getJobDetail().getKey().getGroup(), context.getJobDetail().getKey().getName());
			if (interruptionRequested.get() || Thread.currentThread().isInterrupted()) {
				throw new JobExecutionException("Execução legada interrompida.");
			}
			throw new JobExecutionException("Rotina legada sem executor. Recrie-a como HTTP_REQUEST.");
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
