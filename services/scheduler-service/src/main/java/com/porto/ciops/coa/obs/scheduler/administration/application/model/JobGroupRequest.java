package com.porto.ciops.coa.obs.scheduler.administration.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record JobGroupRequest(
		@Size(max = 80) String id,
		@NotBlank @Size(max = 80) @Pattern(regexp = "[a-z0-9][a-z0-9._-]*") String key,
		@NotBlank @Size(max = 80) String name,
		@NotNull @Size(max = 300) String description,
		boolean active) {
}
