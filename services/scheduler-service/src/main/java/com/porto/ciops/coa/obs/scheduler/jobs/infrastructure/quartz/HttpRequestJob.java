package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.quartz;

import com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.http.HttpRequestJobExecutor;
import org.quartz.DisallowConcurrentExecution;
import org.quartz.InterruptableJob;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.UnableToInterruptJobException;

@DisallowConcurrentExecution
public class HttpRequestJob implements InterruptableJob {

	private final HttpRequestJobExecutor executor;
	private volatile Thread executionThread;

	public HttpRequestJob(HttpRequestJobExecutor executor) {
		this.executor = executor;
	}

	@Override
	public void execute(JobExecutionContext context) throws JobExecutionException {
		executionThread = Thread.currentThread();
		try {
			context.setResult(executor.execute(context.getJobDetail().getKey(), context.getFireInstanceId()));
		}
		catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new JobExecutionException("A requisição HTTP foi interrompida.", exception, false);
		}
		catch (Exception exception) {
			throw new JobExecutionException(safeMessage(exception), exception, false);
		}
		finally {
			executionThread = null;
		}
	}

	@Override
	public void interrupt() throws UnableToInterruptJobException {
		Thread running = executionThread;
		if (running != null) running.interrupt();
	}

	private static String safeMessage(Exception exception) {
		String message = exception.getMessage();
		if (message == null || message.isBlank()) message = exception.getClass().getSimpleName();
		return "Falha na requisição HTTP: " + message;
	}
}
