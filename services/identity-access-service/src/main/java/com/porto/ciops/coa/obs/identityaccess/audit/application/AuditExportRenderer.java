package com.porto.ciops.coa.obs.identityaccess.audit.application;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditQueryStore.Row;
import java.util.List;
import java.util.Map;

/** Output boundary; generation completes before the export is recorded as generated. */
public interface AuditExportRenderer {
    byte[] render(String format,Map<String,Object> metadata,List<Row> rows);
    String contentType(String format);
}
