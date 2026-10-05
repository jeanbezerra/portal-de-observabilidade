package com.porto.ciops.coa.obs.scheduler.administration.application.model;

public record JobTypeResponse(
		String id,
		String name,
		String description,
		String type,
		boolean disallowConcurrent,
		boolean persistJobData,
		boolean interruptable) {
}
