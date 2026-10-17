package com.porto.ciops.coa.obs.identityaccess.audit.application;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.*;
import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.security.MessageDigest;
import java.util.HexFormat;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class AuditQueryService {
    private final java.util.concurrent.Semaphore exportSlot=new java.util.concurrent.Semaphore(1);
    private final AuditQueryStore store;
    private final AuditExportRenderer renderer;
    private final AuditPublisher audit;
    private final TraceContext trace;
    private final Clock clock;
    private final ObjectMapper json;
    public AuditQueryService(AuditQueryStore store,AuditExportRenderer renderer,AuditPublisher audit,TraceContext trace,Clock clock,ObjectMapper json) {
        this.store=store;this.renderer=renderer;this.audit=audit;this.trace=trace;this.clock=clock;this.json=json;
    }
    public AuditFilter filter(String query,String outcome,String eventType,String actor,String target,String providerId,String traceId,String eventId,
            Instant since,Instant until,Instant snapshotAt,String sort,String direction) {
        Instant now=clock.instant();
        Instant snapshot=snapshotAt==null?now:snapshotAt;
        if(snapshot.isAfter(now)) throw new IllegalArgumentException("O instante da consulta não pode estar no futuro.");
        Instant end=until==null||until.isAfter(snapshot)?snapshot:until;
        return new AuditFilter(query,outcome,eventType,actor,target,providerId,traceId,eventId,
            since==null?end.minusSeconds(30L*86400):since,end,snapshot,sort,direction);
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ,timeout=15)
    public AuditQueryStore.Page search(AuditFilter filter,int limit,int offset) {
        if(limit<1||limit>100||offset<0||offset>100000) throw new IllegalArgumentException("Paginação inválida. Use de 1 a 100 eventos por página.");
        var totals=store.totals(filter);
        return new AuditQueryStore.Page(store.rows(filter,limit,offset),totals.total(),limit,offset,totals,filter);
    }
    public record File(byte[] bytes,String contentType,String filename,UUID exportId,String datasetSha256,long count) {}
    @Transactional(isolation=Isolation.REPEATABLE_READ,timeout=30)
    public File export(AuditFilter filter,String format,String purpose,String actor) {
        return export(filter,format,purpose,actor,false);
    }
    @Transactional(isolation=Isolation.REPEATABLE_READ,timeout=30)
    public File export(AuditFilter filter,String format,String purpose,String actor,boolean includeActorNames) {
        if(!exportSlot.tryAcquire()) throw new IllegalArgumentException("Há outra exportação em processamento. Aguarde e tente novamente.");
        try { return generateExport(filter,format,purpose,actor,includeActorNames); }
        finally { exportSlot.release(); }
    }
    private File generateExport(AuditFilter filter,String format,String purpose,String actor,boolean includeActorNames) {
        if(format==null||!java.util.Set.of("csv","json","xlsx","pdf").contains(format)) throw new IllegalArgumentException("Escolha CSV, JSON, XLSX ou PDF.");
        String reason=purpose==null?"":purpose.strip();
        if(reason.length()<10||reason.length()>500||reason.codePoints().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("Informe a finalidade da exportação, com 10 a 500 caracteres e sem quebras de linha.");
        int maximum=format.equals("pdf")?1000:10000;
        var rows=store.rows(filter,maximum+1,0);
        if(rows.isEmpty()) throw new IllegalArgumentException("Não há eventos nesta consulta para exportar.");
        if(rows.size()>maximum) throw new IllegalArgumentException("Esta exportação aceita até "+maximum+" eventos. Refine o período ou os filtros; nenhum arquivo foi gerado.");
        if(!includeActorNames) rows=rows.stream().map(row->new AuditQueryStore.Row(row.id(),row.occurredAt(),row.eventType(),row.actorSubject(),
            row.target(),row.providerId(),row.outcome(),row.traceId(),row.sourceContext(),null,null)).toList();
        UUID id=UUID.randomUUID();Instant at=clock.instant();
        String hash;
        try { hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(rows))); }
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
        Map<String,Object> metadata=new LinkedHashMap<>();
        metadata.put("exportId",id);metadata.put("generatedAt",at);metadata.put("requestedBy",actor);metadata.put("purpose",reason);
        metadata.put("recordCount",rows.size());metadata.put("filters",filter);metadata.put("datasetSha256",hash);
        metadata.put("actorNamesIncluded",includeActorNames);
        metadata.put("hashScope","SHA-256 do array events serializado em JSON UTF-8 pelo serviço; não é assinatura digital.");
        metadata.put("classification","Uso restrito — contém identificadores pessoais. Compartilhe apenas para a finalidade registrada.");
        byte[] bytes=renderer.render(format,metadata,rows);
        store.recordExport(id,actor,at,format,reason,rows.size(),hash,json.writeValueAsString(Map.of("query",filter,"actorNamesIncluded",includeActorNames)));
        audit.publish(AuditEvent.success(at,"audit.exported",actor,id.toString(),null,trace.currentTraceId()));
        return new File(bytes,renderer.contentType(format),"auditoria-"+id+"."+format,id,hash,rows.size());
    }
}
