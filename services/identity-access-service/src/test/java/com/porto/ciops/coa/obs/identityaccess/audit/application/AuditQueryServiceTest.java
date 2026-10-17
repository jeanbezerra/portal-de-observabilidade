package com.porto.ciops.coa.obs.identityaccess.audit.application;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class AuditQueryServiceTest {
    private final AuditQueryStore store=mock(AuditQueryStore.class);
    private final AuditExportRenderer renderer=mock(AuditExportRenderer.class);
    private final AuditPublisher audit=mock(AuditPublisher.class);
    private final Instant now=Instant.parse("2026-10-17T00:00:00Z");
    private final AuditQueryService service=new AuditQueryService(store,renderer,audit,()->"trace-test",Clock.fixed(now,ZoneOffset.UTC),JsonMapper.builder().build());
    private AuditFilter filter(){return service.filter("","","","","","","","",null,null,null,null,null);}
    @Test void fixesTheTimeWindowAndRejectsSqlIdentifiersAndFutureSnapshots(){
        assertThat(filter().since()).isEqualTo(now.minusSeconds(30L*86400));
        assertThat(filter().until()).isEqualTo(now);
        assertThatThrownBy(()->service.filter("","","","","","","","",null,null,null,"id; drop table audit_event","asc")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.filter("","","","","","","","",null,null,now.plusSeconds(1),null,null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.filter("","UNKNOWN","","","","","","",null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.filter("","","","","","","","invalid",null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->service.filter("","","","","","","","",now.plusSeconds(1),now,null,null,null)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void refusesPartialExportsAndDoesNotRecordGeneration(){
        var row=new AuditQueryStore.Row(UUID.randomUUID(),now,"event","actor","target",null,"SUCCESS",null,null,null,null);
        when(store.rows(any(),eq(1001),eq(0))).thenReturn(Collections.nCopies(1001,row));
        assertThatThrownBy(()->service.export(filter(),"pdf","Investigação de acesso","actor")).hasMessageContaining("1000 eventos");
        verifyNoInteractions(renderer,audit);verify(store,never()).recordExport(any(),any(),any(),any(),any(),anyLong(),any(),any());
    }
    @Test void validatesPurposeAndRejectsEmptyExports(){
        assertThatThrownBy(()->service.export(filter(),"json","curta","actor")).isInstanceOf(IllegalArgumentException.class);
        when(store.rows(any(),eq(10001),eq(0))).thenReturn(List.of());
        assertThatThrownBy(()->service.export(filter(),"json","Investigação autorizada","actor")).hasMessageContaining("Não há eventos");
        verifyNoInteractions(renderer,audit);
    }
    @Test void omitsCurrentNamesByDefaultAndRecordsTheDisclosureOption(){
        var row=new AuditQueryStore.Row(UUID.randomUUID(),now,"event","original-subject","target",null,"SUCCESS",null,null,"current-login","Nome atual");
        when(store.rows(any(),eq(10001),eq(0))).thenReturn(List.of(row));
        when(renderer.render(any(),any(),any())).thenReturn(new byte[]{1});
        when(renderer.contentType(any())).thenReturn("application/json");
        service.export(filter(),"json","Investigação autorizada","auditor");
        var captured=org.mockito.ArgumentCaptor.forClass(java.util.List.class);
        verify(renderer).render(eq("json"),any(),captured.capture());
        var masked=(AuditQueryStore.Row)captured.getValue().get(0);
        assertThat(masked.actorSubject()).isEqualTo("original-subject");assertThat(masked.actorUsername()).isNull();assertThat(masked.actorDisplayName()).isNull();
        verify(store).recordExport(any(),eq("auditor"),any(),eq("json"),any(),eq(1L),any(),contains("actorNamesIncluded"));
    }
}
