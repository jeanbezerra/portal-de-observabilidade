package com.porto.ciops.coa.obs.identityaccess.audit.domain;

@FunctionalInterface
public interface AuditPublisher {

	void publish(AuditEvent event);
}
