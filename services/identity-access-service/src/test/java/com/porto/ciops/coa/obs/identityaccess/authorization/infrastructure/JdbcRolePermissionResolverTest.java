package com.porto.ciops.coa.obs.identityaccess.authorization.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.jdbc.core.simple.JdbcClient;

@SuppressWarnings("unchecked")
class JdbcRolePermissionResolverTest {

	@Test
	void mergesDirectAndMappedRolesBeforeResolvingPermissions() {
		JdbcClient jdbcClient = mock(JdbcClient.class);
		JdbcClient.StatementSpec statement = mock(JdbcClient.StatementSpec.class);
		JdbcClient.MappedQuerySpec<String> query = mock(JdbcClient.MappedQuerySpec.class);
		when(jdbcClient.sql(ArgumentMatchers.anyString())).thenReturn(statement);
		when(statement.param(ArgumentMatchers.anyString(), ArgumentMatchers.any())).thenReturn(statement);
		when(statement.query(String.class)).thenReturn(query);
		when(query.list()).thenReturn(List.of("OBS_USER"), List.of("OBS_OPERATOR"), List.of("job:read"));

		var result = new JdbcRolePermissionResolver(jdbcClient).resolve(
				"subject-1", "corporate-ldap", Set.of("operations"));

		assertThat(result.roles()).containsExactlyInAnyOrder("OBS_USER", "OBS_OPERATOR");
		assertThat(result.permissions()).containsExactly("job:read");
		verify(jdbcClient, times(3)).sql(ArgumentMatchers.anyString());
	}

	@Test
	void skipsGroupAndPermissionQueriesWhenThereAreNoInputs() {
		JdbcClient jdbcClient = mock(JdbcClient.class);
		JdbcClient.StatementSpec statement = mock(JdbcClient.StatementSpec.class);
		JdbcClient.MappedQuerySpec<String> query = mock(JdbcClient.MappedQuerySpec.class);
		when(jdbcClient.sql(ArgumentMatchers.anyString())).thenReturn(statement);
		when(statement.param(ArgumentMatchers.anyString(), ArgumentMatchers.any())).thenReturn(statement);
		when(statement.query(String.class)).thenReturn(query);
		when(query.list()).thenReturn(List.of());

		var result = new JdbcRolePermissionResolver(jdbcClient).resolve("subject-1", "corporate-ldap", Set.of());

		assertThat(result.roles()).isEmpty();
		assertThat(result.permissions()).isEmpty();
		verify(jdbcClient).sql(ArgumentMatchers.anyString());
	}
}
