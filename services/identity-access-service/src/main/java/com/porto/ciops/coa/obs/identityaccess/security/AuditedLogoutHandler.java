package com.porto.ciops.coa.obs.identityaccess.security;

import java.time.Clock;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
class AuditedLogoutHandler implements LogoutHandler {
	private static final Logger LOGGER = LoggerFactory.getLogger(AuditedLogoutHandler.class);

	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;

	AuditedLogoutHandler(AuditPublisher auditPublisher, TraceContext traceContext, Clock clock) {
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
	}

	@Override
	public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
		if (authentication == null) {
			return;
		}
		String providerId = authentication.getPrincipal() instanceof PlatformPrincipal principal
				? principal.providerId() : null;
		try {
			auditPublisher.publish(AuditEvent.success(clock.instant(), "authentication.logout",
					authentication.getName(), "browser-session", providerId, traceContext.currentTraceId()));
		}
		catch (RuntimeException exception) {
			if (LOGGER.isWarnEnabled()) {
				LOGGER.warn("Logout audit publication failed", exception);
			}
		}
	}
}
