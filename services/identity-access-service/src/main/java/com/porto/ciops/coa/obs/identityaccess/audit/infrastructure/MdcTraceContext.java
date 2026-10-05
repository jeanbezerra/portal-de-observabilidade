package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure;

import java.util.UUID;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

@Component
class MdcTraceContext implements TraceContext {

	@Override
	public String currentTraceId() {
		String traceId = MDC.get("trace_id");
		if (traceId == null || traceId.isBlank()) {
			traceId = MDC.get("traceId");
		}
		return traceId == null || traceId.isBlank() ? UUID.randomUUID().toString() : traceId;
	}
}
