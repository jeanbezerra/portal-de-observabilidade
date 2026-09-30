package com.porto.ciops.coa.scheduler.api.jobs.application;

import com.porto.ciops.coa.scheduler.api.jobs.application.model.JobRequest;
import org.quartz.Job;

public interface SchedulerJobClassResolver {

	Class<? extends Job> resolve(JobRequest request);

	boolean isManagedFallback(Class<? extends Job> jobClass);
}
