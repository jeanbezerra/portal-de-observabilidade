package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

class MdcTraceContextTest {

	@AfterEach
	void clearMdc() {
		MDC.clear();
	}

	@Test
	void readsTheOpenTelemetryTraceKey() {
		MDC.put("trace_id", "trace-snake");

		assertThat(new MdcTraceContext().currentTraceId()).isEqualTo("trace-snake");
	}

	@Test
	void readsTheLegacyTraceKey() {
		MDC.put("traceId", "trace-camel");

		assertThat(new MdcTraceContext().currentTraceId()).isEqualTo("trace-camel");
	}

	@Test
	void generatesAFallbackWhenNoTraceExists() {
		assertThat(new MdcTraceContext().currentTraceId()).isNotBlank();
	}
}
