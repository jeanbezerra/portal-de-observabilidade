package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record HttpRetryPolicy(
		@Min(1) @Max(5) int maxAttempts,
		@Min(0) @Max(60000) long initialDelayMillis,
		@DecimalMin("1.0") @DecimalMax("5.0") double backoffMultiplier,
		@NotNull @Size(max = 100) List<@Min(100) @Max(599) Integer> statusCodes) {
}
