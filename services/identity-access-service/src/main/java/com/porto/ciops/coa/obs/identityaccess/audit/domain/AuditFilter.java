package com.porto.ciops.coa.obs.identityaccess.audit.domain;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/** Validated, reproducible query shared by the list and every export format. */
public record AuditFilter(String query, String outcome, String eventType, String actor,
        String target, String providerId, String traceId, String eventId,
        Instant since, Instant until, Instant snapshotAt, String sort, String direction) {
    public AuditFilter {
        query = text(query, 255); outcome = text(outcome, 20); eventType = text(eventType, 100);
        actor = text(actor, 255); target = text(target, 255); providerId = text(providerId, 63);
        traceId = text(traceId, 64); eventId = text(eventId, 36);
        if (!Set.of("", "SUCCESS", "FAILURE", "DENIED").contains(outcome))
            throw new IllegalArgumentException("Resultado de auditoria inválido.");
        if (!eventId.isEmpty()) eventId = UUID.fromString(eventId).toString();
        sort = sort == null || sort.isBlank() ? "occurredAt" : sort;
        direction = direction == null || direction.isBlank() ? "desc" : direction;
        if (!Set.of("occurredAt", "eventType", "actor", "target", "providerId", "outcome").contains(sort)
                || !Set.of("asc", "desc").contains(direction))
            throw new IllegalArgumentException("Ordenação de auditoria inválida.");
        if (since == null || until == null || snapshotAt == null || since.isAfter(until)
                || until.isAfter(snapshotAt))
            throw new IllegalArgumentException("Informe um período válido: o início deve ser anterior ao fim.");
    }
    private static String text(String value, int max) {
        String result = value == null ? "" : value.strip();
        if (result.length() > max || result.codePoints().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Um filtro contém caracteres inválidos ou excede o tamanho permitido.");
        return result;
    }
}
