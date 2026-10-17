package com.porto.ciops.coa.obs.identityaccess.administration.api;

import com.porto.ciops.coa.obs.identityaccess.administration.application.AccessAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.administration.application.ActiveSessionService;
import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/security")
class AccessAdministrationController {

	private final AccessAdministrationService administration;
	private final ActiveSessionService sessions;

	AccessAdministrationController(
		AccessAdministrationService administration,
		ActiveSessionService sessions
	) {
		this.administration = administration;
		this.sessions = sessions;
	}

	record UserRequest(
		@NotBlank @Pattern(regexp = "[a-zA-Z0-9][a-zA-Z0-9._@-]{1,254}") String username,
		@NotBlank @Size(max = 255) String displayName,
		@Email @Size(max = 320) String email,
		boolean enabled,
		@NotNull Set<@NotBlank @Size(max = 100) String> roles,
		@NotNull Set<@NotBlank @Size(max = 100) String> groups,
		@Size(max = 72) String password
	) {
		@Override
		public String toString() {
			return "UserRequest[REDACTED]";
		}
	}

	record PasswordRequest(@NotBlank @Size(max = 72) String password) {
		@Override
		public String toString() {
			return "PasswordRequest[REDACTED]";
		}
	}

	record RoleRequest(
		@NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9_-]{1,99}") String key,
		@NotBlank @Size(max = 160) String displayName,
		@NotNull @Size(max = 500) String description,
		boolean enabled,
		@NotNull Set<@NotBlank @Size(max = 140) String> permissions
	) {
		Role domain() {
			return new Role(key, displayName, description, enabled, Set.copyOf(permissions));
		}
	}

	record PermissionRequest(
		@NotBlank @Pattern(regexp = "[a-z][a-z0-9-]{1,62}:[a-z][a-z0-9-]{1,62}") String key,
		@NotNull @Size(max = 500) String description
	) {}

	record GroupRequest(
		@NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9_-]{1,99}") String key,
		@NotBlank @Size(max = 160) String displayName,
		@NotNull @Size(max = 500) String description,
		boolean enabled,
		@NotNull Set<@NotBlank @Size(max = 100) String> roles,
		@NotNull Set<@NotBlank @Size(max = 64) String> members
	) {
		Group domain() {
			return new Group(key, displayName, description, enabled, Set.copyOf(roles), Set.copyOf(members));
		}
	}

	record MappingRequest(
		@NotBlank @Size(max = 63) String providerId,
		@NotBlank @Size(max = 255) String externalGroup,
		@NotBlank @Size(max = 100) String role
	) {}

	@GetMapping("/users")
	@PreAuthorize("hasAuthority('identity:read')")
	List<User> users() {
		return administration.users();
	}

	@PostMapping("/users")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('identity:write') and hasAuthority('role:write')")
	User createUser(@Valid @RequestBody UserRequest body, Principal actor) {
		return administration.saveUser(
			null,
			body.username(),
			body.displayName(),
			body.email(),
			body.enabled(),
			body.roles(),
			body.groups(),
			body.password(),
			actor.getName()
		);
	}

	@PutMapping("/users/{subject}")
	@PreAuthorize("hasAuthority('identity:write') and hasAuthority('role:write')")
	User updateUser(@PathVariable String subject, @Valid @RequestBody UserRequest body, Principal actor) {
		return administration.saveUser(
			subject,
			body.username(),
			body.displayName(),
			body.email(),
			body.enabled(),
			body.roles(),
			body.groups(),
			null,
			actor.getName()
		);
	}

	@PostMapping("/users/{subject}/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('identity:write') and hasAuthority('role:write')")
	void resetPassword(
		@PathVariable String subject,
		@Valid @RequestBody PasswordRequest body,
		Principal actor,
		HttpServletRequest request
	) {
		administration.resetPassword(subject, body.password(), actor.getName());
		if (actor.getName().equals(subject)) invalidate(request);
	}

	@GetMapping("/roles")
	@PreAuthorize("hasAuthority('role:read')")
	List<Role> roles() {
		return administration.roles();
	}

	@PostMapping("/roles")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('role:write')")
	Role createRole(@Valid @RequestBody RoleRequest body, Principal actor) {
		return administration.saveRole(body.domain(), true, actor.getName());
	}

	@PutMapping("/roles/{key}")
	@PreAuthorize("hasAuthority('role:write')")
	Role updateRole(@PathVariable String key, @Valid @RequestBody RoleRequest body, Principal actor) {
		requireSameKey(key, body.key());
		return administration.saveRole(body.domain(), false, actor.getName());
	}

	@DeleteMapping("/roles/{key}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('role:write')")
	void deleteRole(@PathVariable String key, Principal actor) {
		administration.deleteRole(key, actor.getName());
	}

	@GetMapping("/permissions")
	@PreAuthorize("hasAuthority('role:read')")
	List<Permission> permissions() {
		return administration.permissions();
	}

	@PostMapping("/permissions")
	@PreAuthorize("hasAuthority('role:write')")
	Permission savePermission(@Valid @RequestBody PermissionRequest body, Principal actor) {
		return administration.savePermission(new Permission(body.key(), body.description()), actor.getName());
	}

	@DeleteMapping("/permissions/{key}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('role:write')")
	void deletePermission(@PathVariable String key, Principal actor) {
		administration.deletePermission(key, actor.getName());
	}

	@GetMapping("/groups")
	@PreAuthorize("hasAuthority('role:read')")
	List<Group> groups() {
		return administration.groups();
	}

	@PostMapping("/groups")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('role:write')")
	Group createGroup(@Valid @RequestBody GroupRequest body, Principal actor) {
		return administration.saveGroup(body.domain(), true, actor.getName());
	}

	@PutMapping("/groups/{key}")
	@PreAuthorize("hasAuthority('role:write')")
	Group updateGroup(@PathVariable String key, @Valid @RequestBody GroupRequest body, Principal actor) {
		requireSameKey(key, body.key());
		return administration.saveGroup(body.domain(), false, actor.getName());
	}

	@DeleteMapping("/groups/{key}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('role:write')")
	void deleteGroup(@PathVariable String key, Principal actor) {
		administration.deleteGroup(key, actor.getName());
	}

	@GetMapping("/group-mappings")
	@PreAuthorize("hasAuthority('role:read')")
	List<GroupMapping> mappings() {
		return administration.mappings();
	}

	@PostMapping("/group-mappings")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("hasAuthority('role:write')")
	GroupMapping saveMapping(@Valid @RequestBody MappingRequest body, Principal actor) {
		return administration.saveMapping(
			body.providerId(),
			body.externalGroup(),
			body.role(),
			actor.getName()
		);
	}

	@DeleteMapping("/group-mappings/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('role:write')")
	void deleteMapping(@PathVariable String id, Principal actor) {
		administration.deleteMapping(id, actor.getName());
	}

	@GetMapping("/sessions")
	@PreAuthorize("hasAuthority('session:read')")
	List<ActiveSessionService.SessionView> sessions(
		@RequestParam String subject,
		HttpServletRequest request
	) {
		var session = request.getSession(false);
		return sessions.sessions(subject, session == null ? null : session.getId());
	}

	@DeleteMapping("/sessions/{reference}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("hasAuthority('session:revoke')")
	void revoke(
		@PathVariable String reference,
		@RequestParam String subject,
		Principal actor,
		HttpServletRequest request
	) {
		var session = request.getSession(false);
		if (
			sessions.revoke(subject, reference, session == null ? null : session.getId(), actor.getName())
		) invalidate(request);
	}

	@GetMapping("/sessions/overview")
	@PreAuthorize("hasAuthority('session:read')")
	ActiveSessionService.SessionOverview sessionOverview(@RequestParam String subject, HttpServletRequest request) {
		var session = request.getSession(false);
		return sessions.overview(subject, session == null ? null : session.getId());
	}

	record RevokeSessionsRequest(
		@NotBlank @Size(max = 64) String subject,
		@NotNull @Size(min = 1, max = 100) Set<@NotBlank @Pattern(regexp = "[a-f0-9]{64}") String> references,
		@NotNull ActiveSessionService.RevocationReason reason
	) {}

	@PostMapping("/sessions/revoke")
	@PreAuthorize("hasAuthority('session:revoke')")
	ActiveSessionService.RevocationResult revokeSelected(@Valid @RequestBody RevokeSessionsRequest body,
		Principal actor, HttpServletRequest request) {
		var session = request.getSession(false);
		var result = sessions.revokeSelected(body.subject(), body.references(),
			session == null ? null : session.getId(), actor.getName(), body.reason());
		if (result.currentRevoked()) invalidate(request);
		return result;
	}

	private static void requireSameKey(String path, String key) {
		if (!path.equals(key)) throw new IllegalArgumentException("O identificador não pode ser alterado.");
	}

	private static void invalidate(HttpServletRequest request) {
		var session = request.getSession(false);
		if (session != null) session.invalidate();
		SecurityContextHolder.clearContext();
	}
}
