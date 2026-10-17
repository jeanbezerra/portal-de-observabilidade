package com.porto.ciops.coa.obs.identityaccess.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

@RestController
class LocalAuthenticationController {

	private final LocalAccountAuthenticationService authentication;
	private final SessionAuthenticationStrategy sessionStrategy;
	private final SecurityContextRepository contexts;

	LocalAuthenticationController(
		LocalAccountAuthenticationService authentication,
		SessionAuthenticationStrategy sessionStrategy,
		SecurityContextRepository contexts
	) {
		this.authentication = authentication;
		this.sessionStrategy = sessionStrategy;
		this.contexts = contexts;
	}

	public record LoginRequest(
		@NotBlank @Size(max = 255) String username,
		@NotBlank @Size(max = 1024) String credential
	) {
		@Override
		public String toString() {
			return "LoginRequest[REDACTED]";
		}
	}

	public record PasswordChange(
		@NotBlank @Size(max = 1024) String currentPassword,
		@NotBlank @Size(max = 72) String newPassword
	) {
		@Override
		public String toString() {
			return "PasswordChange[REDACTED]";
		}
	}

	@PostMapping("/api/v1/auth/login/local")
	void login(
		@Valid @RequestBody LoginRequest request,
		HttpServletRequest servletRequest,
		HttpServletResponse response
	) {
		var identity = authentication.authenticate(request.username(), request.credential());
		var authenticated = PlatformAuthenticationFactory.authenticated(identity);
		sessionStrategy.onAuthentication(authenticated, servletRequest, response);
		var context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authenticated);
		SecurityContextHolder.setContext(context);
		contexts.saveContext(context, servletRequest, response);
	}

	@PostMapping("/api/v1/me/password")
	void changePassword(
		@Valid @RequestBody PasswordChange request,
		Authentication principal,
		HttpServletRequest servletRequest
	) {
		authentication.changePassword(principal.getName(), request.currentPassword(), request.newPassword());
		var session = servletRequest.getSession(false);
		if (session != null) session.invalidate();
		SecurityContextHolder.clearContext();
	}
}
