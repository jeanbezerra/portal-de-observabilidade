package com.porto.ciops.coa.obs.identityaccess.security;

import com.porto.ciops.coa.obs.identityaccess.administration.application.AccessAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.administration.application.ActiveSessionService;
import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import com.porto.ciops.coa.obs.identityaccess.federation.application.AuthenticationFailedException;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LocalAccountAuthenticationService {

	private final AccessStore store;
	private final PasswordEncoder passwords;
	private final RolePermissionResolver roles;
	private final AuditPublisher audit;
	private final TraceContext trace;
	private final Clock clock;
	private final ActiveSessionService sessions;
	private final String dummyHash;

	public LocalAccountAuthenticationService(
		AccessStore store,
		PasswordEncoder passwords,
		RolePermissionResolver roles,
		AuditPublisher audit,
		TraceContext trace,
		Clock clock,
		ActiveSessionService sessions
	) {
		this.store = store;
		this.passwords = passwords;
		this.roles = roles;
		this.audit = audit;
		this.trace = trace;
		this.clock = clock;
		this.sessions = sessions;
		this.dummyHash = passwords.encode(java.util.UUID.randomUUID().toString());
	}

	@Bean
	static PasswordEncoder localPasswordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	// Authentication failures must commit their counters and audits.
	@Transactional(noRollbackFor = AuthenticationFailedException.class)
	public PlatformIdentity authenticate(String username, String credential) {
		var state = store.password(username);
		boolean matches = passwords.matches(
			credential,
			state.map(AccessStore.PasswordState::hash).orElse(dummyHash)
		);
		if (
			state.isEmpty() ||
			!matches ||
			!state.get().enabled() ||
			(state.get().lockedUntil() != null && state.get().lockedUntil().isAfter(clock.instant()))
		) {
			state.ifPresent(value -> store.loginAttempt(value.subject(), false));
			audit.publish(
				AuditEvent.failure(
					clock.instant(),
					"authentication.failed",
					"local-login",
					"browser-session",
					"local",
					trace.currentTraceId(),
					"invalid-credentials"
				)
			);
			throw new AuthenticationFailedException();
		}
		var user = store.user(state.get().subject()).orElseThrow(AuthenticationFailedException::new);
		store.loginAttempt(user.subject(), true);
		var entitlements = roles.resolve(user.subject(), "local", Set.of());
		audit.publish(
			AuditEvent.success(
				clock.instant(),
				"authentication.succeeded",
				user.subject(),
				"browser-session",
				"local",
				trace.currentTraceId()
			)
		);
		return new PlatformIdentity(
			user.subject(),
			user.username(),
			user.email(),
			user.displayName(),
			"local",
			Set.of(),
			entitlements.roles(),
			entitlements.permissions(),
			Map.of()
		);
	}

	@Transactional(noRollbackFor = AuthenticationFailedException.class)
	public void changePassword(String subject, String current, String replacement) {
		var user = store.user(subject).orElseThrow(AuthenticationFailedException::new);
		var state = store.password(user.username()).orElseThrow(AuthenticationFailedException::new);
		if (!passwords.matches(current, state.hash())) throw new AuthenticationFailedException();
		AccessAdministrationService.validatePassword(replacement);
		store.savePassword(subject, passwords.encode(replacement));
		audit.publish(
			AuditEvent.success(
				clock.instant(),
				"identity.password-changed",
				subject,
				subject,
				"local",
				trace.currentTraceId()
			)
		);
		sessions.revokeAll(subject);
	}
}
