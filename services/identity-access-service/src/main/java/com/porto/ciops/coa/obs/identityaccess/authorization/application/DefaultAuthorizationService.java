package com.porto.ciops.coa.obs.identityaccess.authorization.application;

import java.time.Clock;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationDecision;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationRequest;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationService;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import io.micrometer.observation.annotation.Observed;

@Service
@Transactional
public class DefaultAuthorizationService implements AuthorizationService {

	private final RolePermissionResolver resolver;
	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;

	public DefaultAuthorizationService(RolePermissionResolver resolver, AuditPublisher auditPublisher,
			TraceContext traceContext, Clock clock) {
		this.resolver = resolver;
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
	}

	@Override
	@Observed(name = "authorization.evaluate")
	public AuthorizationDecision authorize(AuthorizationRequest request) {
		RolePermissionResolver.ResolvedEntitlements entitlements = resolver.resolve(request.subject(),
				request.providerId(), request.groups());
		boolean allowed = entitlements.permissions().contains(request.permission().value());
		String reason = allowed ? "permission-granted" : "permission-not-granted";
		AuditEvent event = allowed
				? AuditEvent.success(clock.instant(), "authorization.decision", request.subject(),
						request.permission().value(), request.providerId(), traceContext.currentTraceId())
				: AuditEvent.denied(clock.instant(), "authorization.decision", request.subject(),
						request.permission().value(), traceContext.currentTraceId());
		auditPublisher.publish(event);
		return new AuthorizationDecision(allowed, reason, entitlements.roles(), entitlements.permissions());
	}
}
