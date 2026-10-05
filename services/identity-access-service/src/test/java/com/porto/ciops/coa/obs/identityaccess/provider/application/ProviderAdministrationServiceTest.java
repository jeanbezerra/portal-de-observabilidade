package com.porto.ciops.coa.obs.identityaccess.provider.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class ProviderAdministrationServiceTest {
	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void createsValidatesEnablesAndAuditsAProvider() {
		InMemoryProviders providers = new InMemoryProviders();
		List<AuditEvent> auditEvents = new ArrayList<>();
		ProviderConfigurationValidator validator = new ProviderConfigurationValidator() {
			@Override
			public void validateSecretSafety(IdentityProviderDefinition provider) {
				// This scenario intentionally accepts every secret reference.
			}

			@Override
			public void validate(IdentityProviderDefinition provider) {
				// This scenario intentionally treats every provider as valid.
			}
		};
		ProviderAdministrationService service = new ProviderAdministrationService(providers, validator,
				auditEvents::add, () -> "trace-123", CLOCK);
		ProviderUpsertCommand command = new ProviderUpsertCommand("corporate-oidc", "Corporate OIDC",
				ProviderType.OIDC, 10, Map.of("client-secret-reference", "secret://identity/oidc/secret"),
				Map.of("subject", "sub", "username", "preferred_username"));

		service.create(command, "admin-1");
		service.validate(command.id(), "admin-1");
		IdentityProviderDefinition enabled = service.enable(command.id(), "admin-1");
		IdentityProviderDefinition disabled = service.disable(command.id(), "admin-1");

		assertThat(enabled).isSameAs(disabled);
		assertThat(disabled.status()).isEqualTo(ProviderStatus.DISABLED);
		assertThat(auditEvents).extracting(AuditEvent::eventType).containsExactly(
				"identity-provider.created", "identity-provider.validated", "identity-provider.enabled",
				"identity-provider.disabled");
		assertThat(auditEvents).allMatch(event -> "admin-1".equals(event.actorSubject()));
	}

	@Test
	void updatesADraftProviderAndRejectsImmutableIdentityChanges() {
		InMemoryProviders providers = new InMemoryProviders();
		ProviderAdministrationService service = service(providers);
		ProviderUpsertCommand initial = command("corporate-oidc", ProviderType.OIDC, "Corporate OIDC");
		service.create(initial, "admin-1");
		String providerId = initial.id();

		IdentityProviderDefinition updated = service.update(providerId,
				command(providerId, ProviderType.OIDC, "Updated OIDC"), "admin-1");

		assertThat(updated.displayName()).isEqualTo("Updated OIDC");
		ProviderUpsertCommand changedId = command("another-oidc", ProviderType.OIDC, "Updated OIDC");
		ProviderUpsertCommand changedType = command(providerId, ProviderType.SAML, "Updated OIDC");
		assertThatThrownBy(() -> service.update(providerId, changedId, "admin-1"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("id");
		assertThatThrownBy(() -> service.update(providerId, changedType, "admin-1"))
				.isInstanceOf(IllegalArgumentException.class).hasMessageContaining("type");
	}

	@Test
	void rejectsDuplicateAndMissingProviders() {
		InMemoryProviders providers = new InMemoryProviders();
		ProviderAdministrationService service = service(providers);
		ProviderUpsertCommand command = command("corporate-oidc", ProviderType.OIDC, "Corporate OIDC");
		service.create(command, "admin-1");

		assertThatThrownBy(() -> service.create(command, "admin-1"))
				.isInstanceOf(ProviderAlreadyExistsException.class);
		assertThatThrownBy(() -> service.validate("missing-oidc", "admin-1"))
				.isInstanceOf(ProviderNotFoundException.class);
	}

	private static ProviderAdministrationService service(InMemoryProviders providers) {
		ProviderConfigurationValidator validator = new ProviderConfigurationValidator() {
			@Override public void validate(IdentityProviderDefinition provider) {
				// This scenario intentionally accepts every provider configuration.
			}
			@Override public void validateSecretSafety(IdentityProviderDefinition provider) {
				// This scenario intentionally accepts every secret reference.
			}
		};
		return new ProviderAdministrationService(providers, validator, event -> { }, () -> "trace-123", CLOCK);
	}

	private static ProviderUpsertCommand command(String id, ProviderType type, String name) {
		return new ProviderUpsertCommand(id, name, type, 10,
				Map.of("client-secret-reference", "secret://identity/oidc/secret"),
				Map.of("subject", "sub", "username", "preferred_username"));
	}

	private static final class InMemoryProviders implements IdentityProviderRepository {
		private final Map<ProviderId, IdentityProviderDefinition> entries = new LinkedHashMap<>();

		@Override
		public IdentityProviderDefinition save(IdentityProviderDefinition provider) {
			entries.put(provider.id(), provider);
			return provider;
		}

		@Override
		public boolean existsById(ProviderId providerId) {
			return entries.containsKey(providerId);
		}

		@Override
		public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
			return Optional.ofNullable(entries.get(providerId));
		}

		@Override
		public List<IdentityProviderDefinition> findEnabled() {
			return entries.values().stream().filter(provider -> provider.status() == ProviderStatus.ENABLED).toList();
		}

		@Override
		public List<IdentityProviderDefinition> findByType(ProviderType type) {
			return entries.values().stream().filter(provider -> provider.type() == type).toList();
		}

		@Override
		public List<IdentityProviderDefinition> findAll() {
			return List.copyOf(entries.values());
		}
	}
}
