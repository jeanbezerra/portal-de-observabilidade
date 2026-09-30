package com.porto.ciops.coa.scheduler.api.administration.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TimeZoneRequest(
		@Size(max = 80) String id,
		@NotBlank @Size(max = 80) String label,
		@NotBlank @Size(max = 100) String timeZone,
		@NotNull @Size(max = 300) String description,
		boolean active,
		boolean isDefault) {
}
