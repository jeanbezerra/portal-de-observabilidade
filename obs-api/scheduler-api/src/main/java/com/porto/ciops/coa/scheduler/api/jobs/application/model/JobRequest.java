package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record JobRequest(
		@NotBlank @Size(max = 200) @Pattern(regexp = "[a-z0-9][a-z0-9._-]*") String name,
		@NotBlank @Size(max = 200) @Pattern(regexp = "[a-z0-9][a-z0-9._-]*") String group,
		@NotNull @Size(max = 500) String description,
		@NotBlank @Size(max = 500) String jobClass,
		boolean durable,
		boolean requestsRecovery,
		boolean disallowConcurrent,
		boolean persistJobData,
		boolean interruptable,
		@NotNull List<@Valid JobDataEntryRequest> jobData,
		@NotNull List<@Valid TriggerRequest> triggers) {
}
