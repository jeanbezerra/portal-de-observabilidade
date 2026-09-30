package com.porto.ciops.coa.scheduler.api.jobs.infrastructure.configuration;

import com.porto.ciops.coa.scheduler.api.jobs.infrastructure.quartz.ExecutionHistoryListener;
import jakarta.annotation.PostConstruct;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class QuartzListenerConfiguration {

	private final Scheduler scheduler;
	private final ExecutionHistoryListener executionHistoryListener;

	public QuartzListenerConfiguration(Scheduler scheduler, ExecutionHistoryListener executionHistoryListener) {
		this.scheduler = scheduler;
		this.executionHistoryListener = executionHistoryListener;
	}

	@PostConstruct
	void registerExecutionHistoryListener() throws SchedulerException {
		scheduler.getListenerManager().addJobListener(executionHistoryListener);
	}
}
