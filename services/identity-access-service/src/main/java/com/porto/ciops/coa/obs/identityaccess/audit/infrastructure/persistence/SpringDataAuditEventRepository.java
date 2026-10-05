package com.porto.ciops.coa.obs.identityaccess.audit.infrastructure.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataAuditEventRepository extends JpaRepository<AuditEventEntity, UUID> {
}
