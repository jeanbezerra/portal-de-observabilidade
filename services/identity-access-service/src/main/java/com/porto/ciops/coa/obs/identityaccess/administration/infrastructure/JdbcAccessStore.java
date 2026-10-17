package com.porto.ciops.coa.obs.identityaccess.administration.infrastructure;

import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JdbcAccessStore implements AccessStore {

	private final JdbcClient jdbc;

	JdbcAccessStore(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	private Set<String> values(String sql, String value) {
		return new LinkedHashSet<>(jdbc.sql(sql).param("key", value).query(String.class).list());
	}

	private static Instant instant(ResultSet rs, String column) throws SQLException {
		var timestamp = rs.getTimestamp(column);
		return timestamp == null ? null : timestamp.toInstant();
	}

	private User mapUser(ResultSet rs, int row) throws SQLException {
		String subject = rs.getString("subject");
		return new User(
			subject,
			rs.getString("username"),
			rs.getString("display_name"),
			rs.getString("email"),
			rs.getBoolean("enabled"),
			rs.getBoolean("local"),
			values(
				"select r.role_key from iam_principal_role pr join iam_role r on r.id=pr.role_id where pr.principal_subject=:key order by r.role_key",
				subject
			),
			values(
				"select g.group_key from iam_group_member m join iam_group g on g.id=m.group_id join platform_identity i on i.id=m.identity_id where i.subject=:key order by g.group_key",
				subject
			),
			instant(rs, "created_at"),
			instant(rs, "last_login")
		);
	}

	private static final String USERS = """
	select i.subject, i.username, i.display_name, i.email, i.enabled, i.created_at,
	exists(select 1 from local_credential c where c.identity_id=i.id) as local,
	(select max(l.last_authenticated_at) from external_identity_link l where l.identity_id=i.id) as last_login
	from platform_identity i
	""";

	@Override
	public List<User> users() {
		return jdbc
			.sql(USERS + " order by lower(i.display_name), i.subject limit 1000")
			.query(this::mapUser)
			.list();
	}

	@Override
	public Optional<User> user(String subject) {
		return jdbc
			.sql(USERS + " where i.subject=:subject")
			.param("subject", subject)
			.query(this::mapUser)
			.optional();
	}

	@Override
	public void saveUser(User user, String actor, boolean create) {
		if (create) {
			jdbc.sql(
				"insert into platform_identity(id,subject,username,display_name,email,enabled,created_at,updated_at) values(:id,:subject,:username,:name,:email,:enabled,current_timestamp,current_timestamp)"
			)
				.param("id", UUID.randomUUID())
				.param("subject", user.subject())
				.param("username", user.username())
				.param("name", user.displayName())
				.param("email", user.email())
				.param("enabled", user.enabled())
				.update();
		} else {
			int count = jdbc
				.sql(
					"update platform_identity set display_name=:name,email=:email,enabled=:enabled,updated_at=current_timestamp where subject=:subject"
				)
				.param("name", user.displayName())
				.param("email", user.email())
				.param("enabled", user.enabled())
				.param("subject", user.subject())
				.update();
			if (count == 0) throw new IllegalArgumentException("Usuário não encontrado.");
		}
		jdbc.sql("delete from iam_principal_role where principal_subject=:subject")
			.param("subject", user.subject())
			.update();
		for (String role : user.roles()) {
			int count = jdbc
				.sql(
					"insert into iam_principal_role(principal_subject,role_id,granted_at,granted_by) select :subject,id,current_timestamp,:actor from iam_role where role_key=:role"
				)
				.param("subject", user.subject())
				.param("actor", actor)
				.param("role", role)
				.update();
			if (count == 0) throw new IllegalArgumentException("Perfil não encontrado: " + role);
		}
		jdbc.sql(
			"delete from iam_group_member where identity_id=(select id from platform_identity where subject=:subject)"
		)
			.param("subject", user.subject())
			.update();
		for (String group : user.groups()) {
			int count = jdbc
				.sql(
					"insert into iam_group_member(group_id,identity_id) select g.id,i.id from iam_group g cross join platform_identity i where g.group_key=:group and i.subject=:subject"
				)
				.param("group", group)
				.param("subject", user.subject())
				.update();
			if (count == 0) throw new IllegalArgumentException("Grupo não encontrado: " + group);
		}
	}

	@Override
	public void savePassword(String subject, String hash) {
		jdbc.sql(
			"""
			insert into local_credential(identity_id,password_hash) select id,:hash from platform_identity where subject=:subject
			on conflict(identity_id) do update set password_hash=excluded.password_hash,failed_attempts=0,locked_until=null,updated_at=current_timestamp
			"""
		)
			.param("hash", hash)
			.param("subject", subject)
			.update();
	}

	@Override
	public Optional<PasswordState> password(String username) {
		return jdbc
			.sql(
				"select i.subject,i.enabled,c.password_hash,c.locked_until from platform_identity i join local_credential c on c.identity_id=i.id where lower(i.username)=lower(:username)"
			)
			.param("username", username)
			.query((rs, row) ->
				new PasswordState(
					rs.getString("subject"),
					rs.getString("password_hash"),
					rs.getBoolean("enabled"),
					instant(rs, "locked_until")
				)
			)
			.optional();
	}

	@Override
	public void loginAttempt(String subject, boolean successful) {
		jdbc.sql(
			successful
				? "update local_credential set failed_attempts=0,locked_until=null where identity_id=(select id from platform_identity where subject=:subject)"
				: """
					update local_credential set failed_attempts=case when locked_until < current_timestamp then 1 else failed_attempts+1 end,
					locked_until=case when (case when locked_until < current_timestamp then 1 else failed_attempts+1 end)>=5 then current_timestamp+interval '15 minutes' else null end
					where identity_id=(select id from platform_identity where subject=:subject)
					"""
		)
			.param("subject", subject)
			.update();
	}

	@Override
	public List<Role> roles() {
		return jdbc
			.sql(
				"select role_key,display_name,coalesce(description,'') description,enabled from iam_role order by role_key"
			)
			.query((rs, row) ->
				new Role(
					rs.getString("role_key"),
					rs.getString("display_name"),
					rs.getString("description"),
					rs.getBoolean("enabled"),
					values(
						"select p.permission_key from iam_role_permission rp join iam_role r on r.id=rp.role_id join iam_permission p on p.id=rp.permission_id where r.role_key=:key order by p.permission_key",
						rs.getString("role_key")
					)
				)
			)
			.list();
	}

	@Override
	public void saveRole(Role role, boolean create) {
		int count = jdbc
			.sql(
				create
					? "insert into iam_role(id,role_key,display_name,description,enabled,created_at,updated_at) values(:id,:key,:name,:description,:enabled,current_timestamp,current_timestamp)"
					: "update iam_role set display_name=:name,description=:description,enabled=:enabled,updated_at=current_timestamp where role_key=:key and :id is not null"
			)
			.param("id", UUID.randomUUID())
			.param("key", role.key())
			.param("name", role.displayName())
			.param("description", role.description())
			.param("enabled", role.enabled())
			.update();
		if (count == 0) throw new IllegalArgumentException("Perfil não encontrado.");
		jdbc.sql(
			"delete from iam_role_permission where role_id=(select id from iam_role where role_key=:key)"
		)
			.param("key", role.key())
			.update();
		for (String permission : role.permissions()) {
			count = jdbc
				.sql(
					"insert into iam_role_permission(role_id,permission_id) select r.id,p.id from iam_role r cross join iam_permission p where r.role_key=:key and p.permission_key=:permission"
				)
				.param("key", role.key())
				.param("permission", permission)
				.update();
			if (count == 0) throw new IllegalArgumentException("Permissão não encontrada: " + permission);
		}
	}

	@Override
	public void deleteRole(String key) {
		jdbc.sql("delete from iam_role where role_key=:key").param("key", key).update();
	}

	@Override
	public List<Permission> permissions() {
		return jdbc
			.sql(
				"select permission_key,coalesce(description,'') description from iam_permission order by permission_key"
			)
			.query((rs, row) -> new Permission(rs.getString("permission_key"), rs.getString("description")))
			.list();
	}

	@Override
	public void savePermission(Permission permission) {
		jdbc.sql(
			"insert into iam_permission(id,permission_key,description,created_at) values(:id,:key,:description,current_timestamp) on conflict(permission_key) do update set description=excluded.description"
		)
			.param("id", UUID.randomUUID())
			.param("key", permission.key())
			.param("description", permission.description())
			.update();
	}

	@Override
	public void deletePermission(String key) {
		jdbc.sql("delete from iam_permission where permission_key=:key").param("key", key).update();
	}

	@Override
	public List<Group> groups() {
		return jdbc
			.sql(
				"select group_key,display_name,description,enabled from iam_group order by display_name,group_key"
			)
			.query((rs, row) ->
				new Group(
					rs.getString("group_key"),
					rs.getString("display_name"),
					rs.getString("description"),
					rs.getBoolean("enabled"),
					values(
						"select r.role_key from iam_group_role gr join iam_role r on r.id=gr.role_id join iam_group g on g.id=gr.group_id where g.group_key=:key order by r.role_key",
						rs.getString("group_key")
					),
					values(
						"select i.subject from iam_group_member m join platform_identity i on i.id=m.identity_id join iam_group g on g.id=m.group_id where g.group_key=:key order by i.subject",
						rs.getString("group_key")
					)
				)
			)
			.list();
	}

	@Override
	public void saveGroup(Group group, boolean create) {
		int count = jdbc
			.sql(
				create
					? "insert into iam_group(id,group_key,display_name,description,enabled) values(:id,:key,:name,:description,:enabled)"
					: "update iam_group set display_name=:name,description=:description,enabled=:enabled,updated_at=current_timestamp where group_key=:key and :id is not null"
			)
			.param("id", UUID.randomUUID())
			.param("key", group.key())
			.param("name", group.displayName())
			.param("description", group.description())
			.param("enabled", group.enabled())
			.update();
		if (count == 0) throw new IllegalArgumentException("Grupo não encontrado.");
		jdbc.sql("delete from iam_group_role where group_id=(select id from iam_group where group_key=:key)")
			.param("key", group.key())
			.update();
		for (String role : group.roles()) {
			count = jdbc
				.sql(
					"insert into iam_group_role(group_id,role_id) select g.id,r.id from iam_group g cross join iam_role r where g.group_key=:key and r.role_key=:role"
				)
				.param("key", group.key())
				.param("role", role)
				.update();
			if (count == 0) throw new IllegalArgumentException("Perfil não encontrado: " + role);
		}
		jdbc.sql(
			"delete from iam_group_member where group_id=(select id from iam_group where group_key=:key)"
		)
			.param("key", group.key())
			.update();
		for (String subject : group.members()) {
			count = jdbc
				.sql(
					"insert into iam_group_member(group_id,identity_id) select g.id,i.id from iam_group g cross join platform_identity i where g.group_key=:key and i.subject=:subject"
				)
				.param("key", group.key())
				.param("subject", subject)
				.update();
			if (count == 0) throw new IllegalArgumentException("Usuário não encontrado.");
		}
	}

	@Override
	public void deleteGroup(String key) {
		jdbc.sql("delete from iam_group where group_key=:key").param("key", key).update();
	}

	@Override
	public List<GroupMapping> mappings() {
		return jdbc
			.sql(
				"select m.id,m.provider_id,m.external_group,r.role_key from iam_group_role_mapping m join iam_role r on r.id=m.role_id order by m.provider_id,m.external_group,r.role_key"
			)
			.query((rs, row) ->
				new GroupMapping(
					rs.getString("id"),
					rs.getString("provider_id"),
					rs.getString("external_group"),
					rs.getString("role_key")
				)
			)
			.list();
	}

	@Override
	public void saveMapping(GroupMapping mapping) {
		int count = jdbc
			.sql(
				"insert into iam_group_role_mapping(id,provider_id,external_group,role_id,created_at) select :id,:provider,:external,id,current_timestamp from iam_role where role_key=:role"
			)
			.param("id", UUID.fromString(mapping.id()))
			.param("provider", mapping.providerId())
			.param("external", mapping.externalGroup())
			.param("role", mapping.role())
			.update();
		if (count == 0) throw new IllegalArgumentException("Perfil não encontrado.");
	}

	@Override
	public void deleteMapping(String id) {
		jdbc.sql("delete from iam_group_role_mapping where id=:id").param("id", UUID.fromString(id)).update();
	}

	@Override
	public void lockAdministration() {
		jdbc.sql("select role_key from iam_role where role_key='OBS_ADMIN' for update")
			.query(String.class)
			.single();
	}
}
