package com.porto.ciops.coa.scheduler.api.jobs.infrastructure.quartz;

import com.porto.ciops.coa.scheduler.api.jobs.application.SchedulerJobClassResolver;
import com.porto.ciops.coa.scheduler.api.jobs.application.model.JobRequest;
import com.porto.ciops.coa.scheduler.api.support.ApplicationProblemException;
import org.quartz.Job;
import org.springframework.stereotype.Component;

@Component
public class QuartzSchedulerJobClassResolver implements SchedulerJobClassResolver {

	@Override
	public Class<? extends Job> resolve(JobRequest request) {
		try {
			Class<?> configuredClass = Class.forName(request.jobClass());
			if (!Job.class.isAssignableFrom(configuredClass)) {
				throw ApplicationProblemException.invalidInput("Classe de job inválida",
						"A classe publicada precisa implementar org.quartz.Job.");
			}
			return configuredClass.asSubclass(Job.class);
		}
		catch (ClassNotFoundException ignored) {
			// O fallback mantém jobs catalogados operacionais até a implementação ser implantada.
		}
		return managedJobClass(request.disallowConcurrent(), request.persistJobData());
	}

	@Override
	public boolean isManagedFallback(Class<? extends Job> jobClass) {
		return ManagedJobs.ManagedJob.class.isAssignableFrom(jobClass);
	}

	private static Class<? extends Job> managedJobClass(boolean disallowConcurrent, boolean persistJobData) {
		if (disallowConcurrent && persistJobData) return ManagedJobs.NonConcurrentPersistentManagedJob.class;
		if (disallowConcurrent) return ManagedJobs.NonConcurrentManagedJob.class;
		if (persistJobData) return ManagedJobs.PersistentManagedJob.class;
		return ManagedJobs.ManagedJob.class;
	}
}
