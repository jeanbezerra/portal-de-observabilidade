package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import java.time.Instant;

public record TriggerResponse(
		String key,
		String group,
		String type,
		String state,
		String schedule,
		String expression,
		String timeZone,
		String calendar,
		Instant nextFireTime,
		Instant previousFireTime,
		Instant startAt,
		Instant endAt,
		int priority,
		String misfireInstruction) {
}
