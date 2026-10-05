package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.configuration;

import org.quartz.Job;
import org.quartz.Scheduler;
import org.quartz.spi.JobFactory;
import org.quartz.spi.TriggerFiredBundle;
import org.springframework.beans.factory.config.AutowireCapableBeanFactory;
import org.springframework.boot.quartz.autoconfigure.SchedulerFactoryBeanCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class QuartzJobFactoryConfiguration {

	@Bean
	SchedulerFactoryBeanCustomizer constructorInjectedQuartzJobs(AutowireCapableBeanFactory beanFactory) {
		JobFactory jobFactory = new ConstructorInjectedJobFactory(beanFactory);
		return schedulerFactory -> schedulerFactory.setJobFactory(jobFactory);
	}

	private static final class ConstructorInjectedJobFactory implements JobFactory {

		private final AutowireCapableBeanFactory beanFactory;

		private ConstructorInjectedJobFactory(AutowireCapableBeanFactory beanFactory) {
			this.beanFactory = beanFactory;
		}

		@Override
		public Job newJob(TriggerFiredBundle bundle, Scheduler scheduler) {
			return (Job) beanFactory.createBean(bundle.getJobDetail().getJobClass());
		}

		@Override
		public String toString() {
			return "ConstructorInjectedJobFactory";
		}
	}
}
