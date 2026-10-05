package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record HttpRequestParameter(
		@NotBlank @Size(max = 200) String name,
		@Size(max = 16_000) String value,
		@Size(max = 300) String secretRef) {
}
