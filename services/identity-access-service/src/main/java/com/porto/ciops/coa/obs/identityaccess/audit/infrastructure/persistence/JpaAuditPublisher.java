package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.persistence;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import org.springframework.stereotype.Component;

@Component
class JpaAuditPublisher implements AuditPublisher {

	private final SpringDataAuditEventRepository repository;

	JpaAuditPublisher(SpringDataAuditEventRepository repository) {
		this.repository = repository;
	}

	@Override
	public void publish(AuditEvent event) {
		repository.save(AuditEventEntity.from(event));
	}
}
