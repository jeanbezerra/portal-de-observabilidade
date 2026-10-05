package com.porto.ciops.coa.obs.identityaccess.security;

import java.util.List;
import java.util.Map;

import tools.jackson.databind.ObjectMapper;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml.SamlSecurityConfiguration;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.SessionManagementConfigurer.SessionFixationConfigurer;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
class ApiSecurityConfiguration {

	private static final long CORS_MAX_AGE_SECONDS = 3_600L;

	@Bean
	SecurityFilterChain apiSecurityFilterChain(HttpSecurity http, @Valid IdentityAccessProperties properties,
			AbsoluteSessionLifetimeFilter sessionLifetimeFilter, ObjectMapper objectMapper,
			TraceContext traceContext, SecurityContextRepository securityContextRepository,
			SessionAuthenticationStrategy sessionAuthenticationStrategy,
			AuditedLogoutHandler auditedLogoutHandler,
			SamlSecurityConfiguration samlSecurity,
			JwtAuthenticationConverter jwtAuthenticationConverter) {
		http.authorizeHttpRequests(authorize -> authorize
				.requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
				.requestMatchers(HttpMethod.GET, "/api/v1/auth/providers", "/api/v1/auth/csrf",
						"/api/v1/auth/login/*", "/saml2/**").permitAll()
				.requestMatchers(HttpMethod.POST, "/api/v1/auth/login/*").permitAll()
				.requestMatchers(HttpMethod.POST, "/login/saml2/sso/*").permitAll()
				.anyRequest().authenticated());
		http.cors(Customizer.withDefaults());
		http.csrf(csrf -> csrf.csrfTokenRepository(new CookieCsrfTokenRepository()));
		http.securityContext(context -> context.securityContextRepository(securityContextRepository)
				.requireExplicitSave(true));
		http.sessionManagement(session -> session.sessionFixation(SessionFixationConfigurer::migrateSession)
				.sessionAuthenticationStrategy(sessionAuthenticationStrategy));
		http.logout(logout -> logout.logoutUrl("/api/v1/auth/logout").deleteCookies(
				properties.session().cookieName()).invalidateHttpSession(true).addLogoutHandler(auditedLogoutHandler));
		http.exceptionHandling(errors -> errors
				.authenticationEntryPoint((HttpServletRequest request, HttpServletResponse response,
						AuthenticationException _) -> writeProblem(objectMapper, response,
						HttpServletResponse.SC_UNAUTHORIZED, "Authentication required", "authentication-required",
						request.getRequestURI(),
						traceContext.currentTraceId()))
				.accessDeniedHandler((HttpServletRequest request, HttpServletResponse response,
						AccessDeniedException _) -> writeProblem(objectMapper, response,
						HttpServletResponse.SC_FORBIDDEN, "Access denied", "access-denied", request.getRequestURI(),
						traceContext.currentTraceId())));
		http.addFilterAfter(sessionLifetimeFilter, BasicAuthenticationFilter.class);
		samlSecurity.configure(http, securityContextRepository);

		if (properties.token().resourceServerEnabled()) {
			http.oauth2ResourceServer(resource -> resource.jwt(jwt -> jwt.jwtAuthenticationConverter(
					jwtAuthenticationConverter)));
		}
		return http.build();
	}

	@Bean
	SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	@Bean
	SessionAuthenticationStrategy sessionAuthenticationStrategy() {
		return new ChangeSessionIdAuthenticationStrategy();
	}

	@Bean
	FilterRegistrationBean<AbsoluteSessionLifetimeFilter> disableContainerFilterRegistration(
			AbsoluteSessionLifetimeFilter filter) {
		FilterRegistrationBean<AbsoluteSessionLifetimeFilter> registration = new FilterRegistrationBean<>(filter);
		registration.setEnabled(false);
		return registration;
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(@Valid IdentityAccessProperties properties) {
		CorsConfiguration cors = new CorsConfiguration();
		cors.setAllowedOrigins(properties.security().allowedOrigins());
		cors.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
		cors.setAllowedHeaders(List.of("Accept", "Content-Type", "X-CSRF-TOKEN", "X-XSRF-TOKEN",
				"Authorization", "Traceparent"));
		cors.setExposedHeaders(List.of("Location", "X-CSRF-TOKEN"));
		cors.setAllowCredentials(Boolean.TRUE);
		cors.setMaxAge(CORS_MAX_AGE_SECONDS);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", cors);
		return source;
	}

	static void writeProblem(ObjectMapper mapper, HttpServletResponse response, int status,
			String title, String code, String instance, String traceId) throws java.io.IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		mapper.writeValue(response.getOutputStream(), Map.of(
				"type", "https://docs.obs.local/problems/" + code,
				"title", title, "status", status, "code", code,
				"instance", instance, "traceId", traceId));
	}
}
