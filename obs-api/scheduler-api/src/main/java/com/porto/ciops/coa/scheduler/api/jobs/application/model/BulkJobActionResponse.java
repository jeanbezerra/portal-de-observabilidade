package com.porto.ciops.coa.scheduler.api.jobs.application.model;

import java.util.List;

public record BulkJobActionResponse(int requested, int succeeded, List<String> skipped) {
}
