package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.persistence;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditFilter;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditQueryStore;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAuditQueryStore implements AuditQueryStore {
    private final JdbcClient jdbc;
    JdbcAuditQueryStore(JdbcClient jdbc) { this.jdbc = jdbc; }
    private static final String FROM = " from public.audit_event a left join public.platform_identity p on p.subject=a.actor_subject ";
    private static final String WHERE = """
        where a.occurred_at>=:since and a.occurred_at<=:until and a.occurred_at<=:snapshot
        and (:outcome='' or a.outcome=:outcome) and (:eventType='' or a.event_type=:eventType)
        and (:provider='' or coalesce(a.provider_id,'platform')=:provider)
        and (:trace='' or a.trace_id=:trace) and (:eventId='' or a.id::text=:eventId)
        and (:actor='' or position(lower(:actor) in lower(concat_ws(' ',a.actor_subject,p.username,p.display_name)))>0)
        and (:target='' or position(lower(:target) in lower(a.target))>0)
        and (:query='' or position(lower(:query) in lower(concat_ws(' ',a.id::text,a.event_type,a.actor_subject,
            p.username,p.display_name,a.target,a.provider_id,a.outcome,a.trace_id,a.source_context)))>0)
        """;
    private Map<String,Object> params(AuditFilter f) {
        return Map.ofEntries(Map.entry("since",f.since().atOffset(ZoneOffset.UTC)),
            Map.entry("until",f.until().atOffset(ZoneOffset.UTC)),Map.entry("snapshot",f.snapshotAt().atOffset(ZoneOffset.UTC)),
            Map.entry("outcome",f.outcome()),Map.entry("eventType",f.eventType()),Map.entry("provider",f.providerId()),
            Map.entry("trace",f.traceId()),Map.entry("eventId",f.eventId()),Map.entry("actor",f.actor()),
            Map.entry("target",f.target()),Map.entry("query",f.query()));
    }
    @Override
    public List<Row> rows(AuditFilter f, int limit, int offset) {
        // The only SQL identifiers interpolated here come from this closed mapping.
        String column = switch (f.sort()) {
            case "eventType" -> "a.event_type"; case "actor" -> "coalesce(p.display_name,p.username,a.actor_subject)";
            case "target" -> "a.target"; case "providerId" -> "coalesce(a.provider_id,'platform')";
            case "outcome" -> "a.outcome"; default -> "a.occurred_at";
        };
        String direction = f.direction().equals("asc") ? " asc" : " desc";
        return jdbc.sql("select a.id,a.occurred_at,a.event_type,a.actor_subject,a.target,a.provider_id,a.outcome,a.trace_id,a.source_context,p.username,p.display_name"+
            FROM+WHERE+" order by "+column+direction+",a.occurred_at"+direction+",a.id"+direction+" limit :limit offset :offset")
            .params(params(f)).param("limit",limit).param("offset",offset).query((rs,n)->new Row(
                rs.getObject("id",UUID.class),rs.getTimestamp("occurred_at").toInstant(),rs.getString("event_type"),
                rs.getString("actor_subject"),rs.getString("target"),rs.getString("provider_id"),rs.getString("outcome"),
                rs.getString("trace_id"),rs.getString("source_context"),rs.getString("username"),rs.getString("display_name"))).list();
    }
    @Override
    public Totals totals(AuditFilter f) {
        return jdbc.sql("select count(*) total,count(*) filter(where a.outcome='SUCCESS') success,count(*) filter(where a.outcome='FAILURE') failure,count(*) filter(where a.outcome='DENIED') denied"+FROM+WHERE)
            .params(params(f)).query((rs,n)->new Totals(rs.getLong("total"),rs.getLong("success"),rs.getLong("failure"),rs.getLong("denied"))).single();
    }
    @Override
    public void recordExport(UUID id,String actor,Instant at,String format,String purpose,long count,String hash,String filters) {
        jdbc.sql("insert into public.audit_export_receipt(id,requested_by,created_at,format,purpose,record_count,dataset_sha256,filters) values(:id,:actor,:at,:format,:purpose,:count,:hash,cast(:filters as jsonb))")
            .param("id",id).param("actor",actor).param("at",at.atOffset(ZoneOffset.UTC)).param("format",format)
            .param("purpose",purpose).param("count",count).param("hash",hash).param("filters",filters).update();
    }
}
