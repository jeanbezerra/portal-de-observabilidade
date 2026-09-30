package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BulkJobActionRequest(@NotEmpty List<@Valid BulkJobKeyRequest> jobs) {
}
