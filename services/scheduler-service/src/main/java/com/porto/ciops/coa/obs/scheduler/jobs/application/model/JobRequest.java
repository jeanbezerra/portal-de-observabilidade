package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

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
		@NotBlank @Pattern(regexp = "HTTP_REQUEST") String type,
		@NotNull @Valid HttpRequestConfiguration httpRequest,
		boolean durable,
		boolean requestsRecovery,
		@NotNull @Valid List<TriggerRequest> triggers) {

	public JobRequest {
		if (triggers != null) {
			triggers = List.copyOf(triggers);
		}
	}
}
