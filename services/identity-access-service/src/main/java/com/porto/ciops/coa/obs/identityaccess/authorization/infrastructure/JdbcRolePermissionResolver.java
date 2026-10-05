package com.porto.ciops.coa.obs.identityaccess.authorization.infrastructure;

import java.util.LinkedHashSet;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import io.micrometer.observation.annotation.Observed;

@Repository
class JdbcRolePermissionResolver implements RolePermissionResolver {

	private final JdbcClient jdbcClient;

	JdbcRolePermissionResolver(JdbcClient jdbcClient) {
		this.jdbcClient = jdbcClient;
	}

	@Override
	@Observed(name = "authorization.roles.resolve")
	public ResolvedEntitlements resolve(String subject, String providerId, Set<String> externalGroups) {
		Set<String> roles = new LinkedHashSet<>(jdbcClient.sql("""
				select r.role_key
				from iam_principal_role pr
				join iam_role r on r.id = pr.role_id
				where pr.principal_subject = :subject and r.enabled = true
				""").param("subject", subject).query(String.class).list());

		if (!externalGroups.isEmpty()) {
			roles.addAll(jdbcClient.sql("""
					select distinct r.role_key
					from iam_group_role_mapping gm
					join iam_role r on r.id = gm.role_id
					where gm.provider_id = :providerId
					  and gm.external_group in (:groups)
					  and r.enabled = true
					""").param("providerId", providerId).param("groups", externalGroups)
					.query(String.class).list());
		}

		Set<String> permissions = roles.isEmpty() ? Set.of() : new LinkedHashSet<>(jdbcClient.sql("""
				select distinct p.permission_key
				from iam_role_permission rp
				join iam_role r on r.id = rp.role_id
				join iam_permission p on p.id = rp.permission_id
				where r.role_key in (:roles) and r.enabled = true
				""").param("roles", roles).query(String.class).list());

		return new ResolvedEntitlements(roles, permissions);
	}
}
