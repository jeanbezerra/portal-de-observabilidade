package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record JobDataEntryRequest(
		@NotBlank @Size(max = 200) String key,
		@NotBlank @Pattern(regexp = "String|Integer|Boolean|JSON") String type,
		@NotNull @Size(max = 4000) String value,
		boolean sensitive) {
}
