package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

public record ExecutionLogSearchCriteria(
		int page,
		int pageSize,
		String sort,
		String direction,
		String level,
		String fireInstanceId,
		String query) {
}
