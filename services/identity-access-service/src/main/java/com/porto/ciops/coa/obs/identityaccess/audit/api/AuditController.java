package com.porto.ciops.coa.obs.identityaccess.audit.api;

import com.porto.ciops.coa.obs.identityaccess.audit.application.AuditQueryService;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditFilter;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditQueryStore.Page;
import java.security.Principal;
import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/security/audit")
public class AuditController {
    private final AuditQueryService service;
    public AuditController(AuditQueryService service){this.service=service;}
    public record Parameters(String query,String outcome,String eventType,String actor,String target,String providerId,String traceId,String eventId,
        @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant since,
        @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant until,
        @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) Instant snapshotAt,String sort,String direction,Integer limit,Integer offset) {}
    private AuditFilter filter(Parameters p){return service.filter(p.query(),p.outcome(),p.eventType(),p.actor(),p.target(),p.providerId(),p.traceId(),p.eventId(),p.since(),p.until(),p.snapshotAt(),p.sort(),p.direction());}
    @GetMapping
    @PreAuthorize("hasAuthority('audit:read')")
    public Page search(@ModelAttribute Parameters p){return service.search(filter(p),p.limit()==null?50:p.limit(),p.offset()==null?0:p.offset());}
    public record ExportRequest(String format,String purpose,Boolean includeActorNames) {}
    @PostMapping("/export")
    @PreAuthorize("hasAuthority('audit:read') and hasAuthority('audit:export')")
    public ResponseEntity<byte[]> export(@ModelAttribute Parameters p,@RequestBody ExportRequest body,org.springframework.security.core.Authentication principal){
        if(Boolean.TRUE.equals(body.includeActorNames())&&principal.getAuthorities().stream().noneMatch(authority->authority.getAuthority().equals("identity:read")))
            throw new org.springframework.security.access.AccessDeniedException("A inclusão de nomes requer a permissão de consulta de identidades.");
        var file=service.export(filter(p),body.format(),body.purpose(),principal.getName(),Boolean.TRUE.equals(body.includeActorNames()));
        return ResponseEntity.ok().header("Content-Type",file.contentType()).header("Content-Disposition","attachment; filename=\""+file.filename()+"\"")
            .header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff")
            .header("X-Audit-Export-Id",file.exportId().toString()).header("X-Audit-Dataset-SHA256",file.datasetSha256())
            .header("X-Audit-Record-Count",Long.toString(file.count())).body(file.bytes());
    }
}
