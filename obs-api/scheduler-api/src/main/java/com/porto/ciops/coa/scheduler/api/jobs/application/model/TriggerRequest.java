package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record TriggerRequest(
		@NotBlank @Size(max = 200) @Pattern(regexp = "[a-z0-9][a-z0-9._-]*") String key,
		@NotBlank @Size(max = 200) @Pattern(regexp = "[a-z0-9][a-z0-9._-]*") String group,
		@NotBlank @Pattern(regexp = "CronTrigger|SimpleTrigger|CalendarIntervalTrigger|DailyTimeIntervalTrigger") String type,
		@NotBlank @Size(max = 500) String expression,
		@NotBlank @Size(max = 100) String timeZone,
		@Size(max = 200) String calendar,
		@Min(1) @Max(10) int priority,
		@NotBlank @Size(max = 80) String misfireInstruction) {
}
