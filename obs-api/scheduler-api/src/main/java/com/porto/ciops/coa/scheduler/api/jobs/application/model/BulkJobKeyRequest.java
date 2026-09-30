package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BulkJobKeyRequest(
		@NotBlank @Size(max = 200) String group,
		@NotBlank @Size(max = 200) String name) {
}
