package com.porto.ciops.coa.scheduler.api.jobs.application.model;

public record JobDataEntryResponse(
		String key,
		String type,
		String value,
		boolean sensitive) {
}
