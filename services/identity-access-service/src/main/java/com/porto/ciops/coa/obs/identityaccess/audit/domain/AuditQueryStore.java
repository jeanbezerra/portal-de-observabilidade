package com.porto.ciops.coa.obs.identityaccess.audit.domain;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface AuditQueryStore {
    record Row(UUID id, Instant occurredAt, String eventType, String actorSubject,
        String target, String providerId, String outcome, String traceId, String sourceContext,
        String actorUsername, String actorDisplayName) {}
    record Totals(long total, long success, long failure, long denied) {}
    record Page(List<Row> items, long total, int limit, int offset, Totals totals, AuditFilter filters) {}
    List<Row> rows(AuditFilter filters, int limit, int offset);
    Totals totals(AuditFilter filters);
    void recordExport(UUID id, String actor, Instant createdAt, String format, String purpose,
        long count, String hash, String filtersJson);
}
