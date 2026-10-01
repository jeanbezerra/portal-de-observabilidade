package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record JobTypeConfigurationRequest(
		@NotBlank @Pattern(regexp = "HTTP_REQUEST") String type,
		@NotNull @Valid HttpRequestConfiguration httpRequest) {
}
