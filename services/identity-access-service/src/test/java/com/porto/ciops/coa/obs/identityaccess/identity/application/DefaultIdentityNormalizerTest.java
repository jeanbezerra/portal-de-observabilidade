package com.porto.ciops.coa.obs.identityaccess.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class DefaultIdentityNormalizerTest {

	@Test
	void normalizesMappedAttributesAndRemovesSensitiveValues() {
		ProviderId providerId = new ProviderId("corporate-oidc");
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(providerId, "Corporate OIDC",
				ProviderType.OIDC, 0, Map.of(), Map.of(
						"subject", "sub", "username", "preferred_username", "email", "mail",
						"displayName", "name", "groups", "groups"), Instant.EPOCH);
		IdentityProviderRegistry registry = registry(provider);
		RolePermissionResolver resolver = (subject, sourceProvider, groups) ->
				new RolePermissionResolver.ResolvedEntitlements(Set.of("OPS"), Set.of("job:read"));
		DefaultIdentityNormalizer normalizer = new DefaultIdentityNormalizer(registry, resolver);

		PlatformIdentity result = normalizer.normalize(new FederatedIdentity("external-123", providerId,
				ProviderType.OIDC, Map.of("preferred_username", "maria", "mail", "maria@example.com",
						"name", "Maria", "groups", List.of("ops", "on-call"), "access_token", "secret")));

		assertThat(result.username()).isEqualTo("maria");
		assertThat(result.groups()).containsExactlyInAnyOrder("ops", "on-call");
		assertThat(result.roles()).containsExactly("OPS");
		assertThat(result.permissions()).containsExactly("job:read");
		assertThat(result.attributes()).doesNotContainKey("access_token");
		assertThat(result.subject()).isEqualTo(normalizer.normalize(new FederatedIdentity("external-123",
				providerId, ProviderType.OIDC, Map.of("preferred_username", "maria"))).subject());
	}

	@Test
	void normalizesArrayAndDelimitedGroupsWithDisplayNameFallback() {
		ProviderId providerId = new ProviderId("corporate-oidc");
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(providerId, "Corporate OIDC",
				ProviderType.OIDC, 0, Map.of(), Map.of("subject", "sub", "username", "username",
						"groups", "groups"), Instant.EPOCH);
		DefaultIdentityNormalizer normalizer = new DefaultIdentityNormalizer(registry(provider),
				(subject, sourceProvider, groups) ->
						new RolePermissionResolver.ResolvedEntitlements(Set.of(), Set.of()));

		PlatformIdentity arrayGroups = normalizer.normalize(new FederatedIdentity("external-1", providerId,
				ProviderType.OIDC, Map.of("username", "maria", "groups", new Object[] { "ops", " ", null })));
		PlatformIdentity delimitedGroups = normalizer.normalize(new FederatedIdentity("external-2", providerId,
				ProviderType.OIDC, Map.of("username", "joao", "groups", "ops, on-call, ")));
		PlatformIdentity missingGroups = normalizer.normalize(new FederatedIdentity("external-3", providerId,
				ProviderType.OIDC, Map.of("username", "ana")));

		assertThat(arrayGroups.groups()).containsExactly("ops");
		assertThat(arrayGroups.displayName()).isEqualTo("maria");
		assertThat(delimitedGroups.groups()).containsExactlyInAnyOrder("ops", "on-call");
		assertThat(missingGroups.groups()).isEmpty();
	}

	@Test
	void rejectsMissingProvidersAndRequiredMappedValues() {
		ProviderId providerId = new ProviderId("corporate-oidc");
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(providerId, "Corporate OIDC",
				ProviderType.OIDC, 0, Map.of(), Map.of("subject", "sub", "username", "username"), Instant.EPOCH);
		RolePermissionResolver resolver = (subject, sourceProvider, groups) ->
				new RolePermissionResolver.ResolvedEntitlements(Set.of(), Set.of());
		DefaultIdentityNormalizer normalizer = new DefaultIdentityNormalizer(registry(provider), resolver);
		FederatedIdentity missingUsername = new FederatedIdentity("external-1", providerId,
				ProviderType.OIDC, Map.of("username", " "));
		DefaultIdentityNormalizer missingProvider = new DefaultIdentityNormalizer(new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId id) {
				return Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return List.of();
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return List.of();
			}
		}, resolver);

		assertThatThrownBy(() -> normalizer.normalize(missingUsername))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> missingProvider.normalize(missingUsername))
				.isInstanceOf(com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException.class);
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId id) {
				return provider.id().equals(id) ? Optional.of(provider) : Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return List.of(provider);
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}
}
