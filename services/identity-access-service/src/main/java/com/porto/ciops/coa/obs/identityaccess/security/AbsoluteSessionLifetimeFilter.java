package com.porto.ciops.coa.obs.identityaccess.security;

import java.io.IOException;
import java.time.Clock;

import tools.jackson.databind.ObjectMapper;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
class AbsoluteSessionLifetimeFilter extends OncePerRequestFilter {

	@Valid
	private final IdentityAccessProperties properties;
	private final Clock clock;
	private final ObjectMapper objectMapper;
	private final TraceContext traceContext;

	AbsoluteSessionLifetimeFilter(IdentityAccessProperties properties, Clock clock, ObjectMapper objectMapper,
			TraceContext traceContext) {
		this.properties = properties;
		this.clock = clock;
		this.objectMapper = objectMapper;
		this.traceContext = traceContext;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		HttpSession session = request.getSession(false);
		if (session != null && clock.millis() - session.getCreationTime()
				> properties.session().maximumLifetime().toMillis()) {
			session.invalidate();
			response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
			response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
			objectMapper.writeValue(response.getOutputStream(), java.util.Map.of(
					"type", "https://docs.obs.local/problems/session-expired",
					"title", "Session expired", "status", HttpServletResponse.SC_UNAUTHORIZED,
					"detail", "The maximum session lifetime was reached",
					"code", "session-expired", "instance", request.getRequestURI(),
					"traceId", traceContext.currentTraceId()));
			return;
		}
		filterChain.doFilter(request, response);
	}
}
