package com.porto.ciops.coa.obs.identityaccess.identity.infrastructure;

import com.porto.ciops.coa.obs.identityaccess.identity.domain.IdentityDirectory;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.authentication.DisabledException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
class JdbcIdentityDirectory implements IdentityDirectory {

	private final JdbcClient jdbc;

	JdbcIdentityDirectory(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	@Transactional
	public PlatformIdentity register(PlatformIdentity identity, String externalSubject) {
		int count = jdbc
			.sql(
				"""
				insert into platform_identity(id,subject,username,email,display_name,enabled,created_at,updated_at)
				values(:id,:subject,:username,:email,:name,true,current_timestamp,current_timestamp)
				on conflict(subject) do update set username=excluded.username,email=excluded.email,
				display_name=excluded.display_name,updated_at=current_timestamp where platform_identity.enabled=true
				"""
			)
			.param("id", UUID.randomUUID())
			.param("subject", identity.subject())
			.param("username", identity.username())
			.param("email", identity.email())
			.param("name", identity.displayName())
			.update();
		if (count == 0) throw new DisabledException("User account is disabled");
		jdbc.sql(
			"""
			insert into external_identity_link(id,identity_id,provider_id,external_subject,last_authenticated_at,created_at)
			select :id,i.id,p.id,:external,current_timestamp,current_timestamp from platform_identity i cross join identity_provider p
			where i.subject=:subject and p.provider_key=:provider
			on conflict(provider_id,external_subject) do update set last_authenticated_at=current_timestamp
			"""
		)
			.param("id", UUID.randomUUID())
			.param("external", externalSubject)
			.param("subject", identity.subject())
			.param("provider", identity.providerId())
			.update();
		return identity;
	}

	@Override
	public boolean enabled(String subject) {
		return jdbc
			.sql("select enabled from platform_identity where subject=:subject")
			.param("subject", subject)
			.query(Boolean.class)
			.optional()
			.orElse(false);
	}
}
