package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.io.IOException;
import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;

import tools.jackson.databind.ObjectMapper;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

@Component
public class SamlAuthenticationFailureHandler implements AuthenticationFailureHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(SamlAuthenticationFailureHandler.class);
	private static final String CALLBACK_PREFIX = "/login/saml2/sso/";
	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;
	private final ObjectMapper objectMapper;

	public SamlAuthenticationFailureHandler(AuditPublisher auditPublisher, TraceContext traceContext,
			Clock clock, ObjectMapper objectMapper) {
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
		this.objectMapper = objectMapper;
	}

	@Override
	public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
			AuthenticationException exception) throws IOException, ServletException {
		String providerId = providerId(request.getRequestURI());
		try {
			auditPublisher.publish(AuditEvent.failure(clock.instant(), "authentication.failed", "saml-login",
					"browser-session", providerId, traceContext.currentTraceId(), "saml-validation-failed"));
		}
		catch (RuntimeException auditFailure) {
			if (LOGGER.isWarnEnabled()) {
				LOGGER.warn("Unable to persist the SAML authentication failure audit", auditFailure);
			}
		}
		response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		Map<String, Object> problem = new LinkedHashMap<>();
		problem.put("type", "https://docs.obs.local/problems/authentication-failed");
		problem.put("title", "Authentication failed");
		problem.put("status", HttpServletResponse.SC_UNAUTHORIZED);
		problem.put("detail", "The SAML response could not be authenticated");
		problem.put("code", "authentication-failed");
		problem.put("instance", request.getRequestURI());
		problem.put("traceId", traceContext.currentTraceId());
		objectMapper.writeValue(response.getOutputStream(), problem);
	}

	private static String providerId(String requestUri) {
		if (requestUri == null || !requestUri.startsWith(CALLBACK_PREFIX)) {
			return null;
		}
		String candidate = requestUri.substring(CALLBACK_PREFIX.length());
		try {
			return new ProviderId(candidate).value();
		}
		catch (IllegalArgumentException _) {
			return null;
		}
	}
}
