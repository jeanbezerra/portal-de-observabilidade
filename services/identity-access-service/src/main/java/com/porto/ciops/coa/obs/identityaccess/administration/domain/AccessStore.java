package com.porto.ciops.coa.obs.identityaccess.administration.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface AccessStore {
	record User(
		String subject,
		String username,
		String displayName,
		String email,
		boolean enabled,
		boolean local,
		Set<String> roles,
		Set<String> groups,
		Instant createdAt,
		Instant lastLogin
	) {}

	record Role(
		String key,
		String displayName,
		String description,
		boolean enabled,
		Set<String> permissions
	) {}

	record Permission(String key, String description) {}

	record Group(
		String key,
		String displayName,
		String description,
		boolean enabled,
		Set<String> roles,
		Set<String> members
	) {}

	record GroupMapping(String id, String providerId, String externalGroup, String role) {}


	record PasswordState(String subject, String hash, boolean enabled, Instant lockedUntil) {
		@Override
		public String toString() {
			return "PasswordState[REDACTED]";
		}
	}

	List<User> users();
	Optional<User> user(String subject);
	void saveUser(User user, String actor, boolean create);
	void savePassword(String subject, String hash);
	Optional<PasswordState> password(String username);
	void loginAttempt(String subject, boolean successful);
	List<Role> roles();
	void saveRole(Role role, boolean create);
	void deleteRole(String key);
	List<Permission> permissions();
	void savePermission(Permission permission);
	void deletePermission(String key);
	List<Group> groups();
	void saveGroup(Group group, boolean create);
	void deleteGroup(String key);
	List<GroupMapping> mappings();
	void saveMapping(GroupMapping mapping);
	void deleteMapping(String id);
	void lockAdministration();
}
