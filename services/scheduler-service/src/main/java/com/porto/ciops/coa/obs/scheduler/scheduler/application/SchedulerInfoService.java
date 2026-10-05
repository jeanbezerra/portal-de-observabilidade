package com.porto.ciops.coa.obs.scheduler.scheduler.application;

import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.SchedulerMetaData;
import org.springframework.stereotype.Service;

@Service
public class SchedulerInfoService {

	private final Scheduler scheduler;

	public SchedulerInfoService(Scheduler scheduler) {
		this.scheduler = scheduler;
	}

	public SchedulerInfo getSchedulerInfo() throws SchedulerException {
		SchedulerMetaData metadata = scheduler.getMetaData();

		return new SchedulerInfo(
				scheduler.getSchedulerName(),
				scheduler.getSchedulerInstanceId(),
				metadata.getVersion(),
				resolveState(),
				metadata.isJobStoreClustered(),
				metadata.getThreadPoolSize(),
				metadata.getNumberOfJobsExecuted(),
				metadata.getRunningSince().toInstant());
	}

	private String resolveState() throws SchedulerException {
		String state;
		if (scheduler.isShutdown()) {
			state = "SHUTDOWN";
		}
		else if (scheduler.isInStandbyMode()) {
			state = "STANDBY";
		}
		else if (scheduler.isStarted()) {
			state = "RUNNING";
		}
		else {
			state = "STARTING";
		}
		return state;
	}
}
