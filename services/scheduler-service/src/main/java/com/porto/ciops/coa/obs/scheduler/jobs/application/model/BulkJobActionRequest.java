package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkJobActionRequest(@NotEmpty @Valid List<BulkJobKeyRequest> jobs) {

	public BulkJobActionRequest {
		if (jobs != null) {
			jobs = List.copyOf(jobs);
		}
	}
}
