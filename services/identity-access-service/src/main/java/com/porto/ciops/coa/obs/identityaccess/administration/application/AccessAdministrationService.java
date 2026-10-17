package com.porto.ciops.coa.obs.identityaccess.administration.application;

import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore;
import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore.*;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccessAdministrationService {

	private final AccessStore store;
	private final PasswordEncoder passwords;
	private final AuditPublisher audit;
	private final TraceContext trace;
	private final Clock clock;
	private final IdentityProviderRegistry providers;
	private final ActiveSessionService sessions;

	public AccessAdministrationService(
		AccessStore store,
		PasswordEncoder passwords,
		AuditPublisher audit,
		TraceContext trace,
		Clock clock,
		IdentityProviderRegistry providers,
		ActiveSessionService sessions
	) {
		this.store = store;
		this.passwords = passwords;
		this.audit = audit;
		this.trace = trace;
		this.clock = clock;
		this.providers = providers;
		this.sessions = sessions;
	}

	@Transactional(readOnly = true)
	public List<User> users() {
		return store.users();
	}

	@Transactional(readOnly = true)
	public List<Role> roles() {
		return store.roles();
	}

	@Transactional(readOnly = true)
	public List<Permission> permissions() {
		return store.permissions();
	}

	@Transactional(readOnly = true)
	public List<Group> groups() {
		return store.groups();
	}

	@Transactional(readOnly = true)
	public List<GroupMapping> mappings() {
		return store.mappings();
	}

	public User saveUser(
		String subject,
		String username,
		String displayName,
		String email,
		boolean enabled,
		Set<String> roles,
		Set<String> groups,
		String password,
		String actor
	) {
		store.lockAdministration();
		boolean create = subject == null;
		if (!create) {
			User current = store
				.user(subject)
				.orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
			if (!current.username().equals(username)) throw new IllegalArgumentException(
				"O identificador de login não pode ser alterado."
			);
			if (
				!current.local() &&
				(!current.displayName().equals(displayName) ||
					!java.util.Objects.equals(current.email(), email))
			) throw new IllegalArgumentException(
				"O nome e o e-mail deste usuário são gerenciados pelo provedor externo."
			);
		}
		if (actor.equals(subject) && !enabled) throw new IllegalArgumentException(
			"Você não pode bloquear seu próprio usuário."
		);
		User user = new User(
			create ? UUID.randomUUID().toString() : subject,
			username,
			displayName,
			email,
			enabled,
			create || store.user(subject).orElseThrow().local(),
			Set.copyOf(roles),
			Set.copyOf(groups),
			clock.instant(),
			null
		);
		if (create) validatePassword(password);
		store.saveUser(user, actor, create);
		if (create) store.savePassword(user.subject(), passwords.encode(password));
		ensureAdministrator();
		publish(create ? "identity.created" : "identity.updated", actor, user.subject());
		if (!enabled) sessions.revokeAll(user.subject());
		return store.user(user.subject()).orElseThrow();
	}

	public void resetPassword(String subject, String password, String actor) {
		User user = store
			.user(subject)
			.orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado."));
		if (!user.local()) throw new IllegalArgumentException(
			"A senha deste usuário é gerenciada pelo provedor externo."
		);
		validatePassword(password);
		store.savePassword(subject, passwords.encode(password));
		publish("identity.password-reset", actor, subject);
		sessions.revokeAll(subject);
	}

	public Role saveRole(Role role, boolean create, String actor) {
		store.lockAdministration();
		if ("OBS_ADMIN".equals(role.key())) throw new IllegalArgumentException(
			"O perfil de administração do sistema é protegido."
		);
		store.saveRole(role, create);
		publish(create ? "role.created" : "role.updated", actor, role.key());
		return role;
	}

	public void deleteRole(String key, String actor) {
		store.lockAdministration();
		if ("OBS_ADMIN".equals(key)) throw new IllegalArgumentException(
			"O perfil de administração do sistema é protegido."
		);
		store.deleteRole(key);
		publish("role.deleted", actor, key);
	}

	public Permission savePermission(Permission permission, String actor) {
		store.savePermission(permission);
		publish("permission.saved", actor, permission.key());
		return permission;
	}

	public void deletePermission(String key, String actor) {
		boolean systemPermission = store
			.roles()
			.stream()
			.filter(r -> r.key().equals("OBS_ADMIN"))
			.anyMatch(r -> r.permissions().contains(key));
		if (systemPermission) throw new IllegalArgumentException(
			"Permissões de administração do sistema são protegidas."
		);
		store.deletePermission(key);
		publish("permission.deleted", actor, key);
	}

	public Group saveGroup(Group group, boolean create, String actor) {
		store.lockAdministration();
		store.saveGroup(group, create);
		ensureAdministrator();
		publish(create ? "group.created" : "group.updated", actor, group.key());
		return group;
	}

	public void deleteGroup(String key, String actor) {
		store.lockAdministration();
		store.deleteGroup(key);
		ensureAdministrator();
		publish("group.deleted", actor, key);
	}

	public GroupMapping saveMapping(String provider, String externalGroup, String role, String actor) {
		providers
			.findById(new ProviderId(provider))
			.orElseThrow(() -> new IllegalArgumentException("Provedor externo não encontrado."));
		GroupMapping mapping = new GroupMapping(UUID.randomUUID().toString(), provider, externalGroup, role);
		store.saveMapping(mapping);
		publish("group-mapping.created", actor, mapping.id());
		return mapping;
	}

	public void deleteMapping(String id, String actor) {
		store.deleteMapping(id);
		publish("group-mapping.deleted", actor, id);
	}

	private void ensureAdministrator() {
		List<Group> groups = store.groups();
		boolean available = store
			.users()
			.stream()
			.filter(User::enabled)
			.filter(User::local)
			.anyMatch(
				user ->
					user.roles().contains("OBS_ADMIN") ||
					groups
						.stream()
						.anyMatch(
							group ->
								group.enabled() &&
								group.roles().contains("OBS_ADMIN") &&
								group.members().contains(user.subject())
						)
			);
		if (!available) throw new IllegalArgumentException(
			"Mantenha pelo menos um administrador local ativo."
		);
	}

	public static void validatePassword(String password) {
		if (
			password == null ||
			password.length() < 12 ||
			password.getBytes(StandardCharsets.UTF_8).length > 72
		) throw new IllegalArgumentException(
			"A senha deve ter pelo menos 12 caracteres e no máximo 72 bytes."
		);
	}

	private void publish(String event, String actor, String target) {
		audit.publish(
			AuditEvent.success(clock.instant(), event, actor, target, null, trace.currentTraceId())
		);
	}
}
