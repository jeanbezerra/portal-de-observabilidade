package com.porto.ciops.coa.obs.identityaccess.audit.domain;

@FunctionalInterface
public interface TraceContext {

	String currentTraceId();
}
