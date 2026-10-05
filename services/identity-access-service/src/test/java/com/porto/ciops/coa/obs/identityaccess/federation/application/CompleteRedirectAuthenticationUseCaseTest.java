package com.porto.ciops.coa.obs.identityaccess.federation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class CompleteRedirectAuthenticationUseCaseTest {

	private static final ProviderId PROVIDER_ID = new ProviderId("corporate-entra");
	private final List<AuditEvent> events = new ArrayList<>();
	private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void mapsTheValidatedSamlIdentityAndAuditsSuccessWithoutAnAssertion() {
		AtomicReference<FederatedIdentity> normalizedInput = new AtomicReference<>();
		PlatformIdentity expected = new PlatformIdentity("subject-1", "maria@example.com", "maria@example.com",
				"Maria Silva", PROVIDER_ID.value(), Set.of("operations"), Set.of("OBS_OPERATOR"),
				Set.of("job:read"), Map.of("department", "operations"));
		CompleteRedirectAuthenticationUseCase useCase = new CompleteRedirectAuthenticationUseCase(
				registry(enabledProvider()), identity -> {
					normalizedInput.set(identity);
					return expected;
				}, events::add, () -> "trace-123", clock);

		PlatformIdentity result = useCase.completeSaml(PROVIDER_ID.value(), "entra-name-id", Map.of(
				"objectidentifier", "entra-object-id",
				"emailaddress", "maria@example.com",
				"name", "Maria Silva",
				"groups", List.of("operations")));

		assertThat(result).isEqualTo(expected);
		assertThat(normalizedInput.get().externalSubject()).isEqualTo("entra-object-id");
		assertThat(normalizedInput.get().attributes()).containsEntry("NameID", "entra-name-id")
				.doesNotContainKeys("SAMLResponse", "assertion");
		assertThat(events).singleElement().satisfies(event -> {
			assertThat(event.eventType()).isEqualTo("authentication.succeeded");
			assertThat(event.providerId()).isEqualTo(PROVIDER_ID.value());
			assertThat(event.actorSubject()).isEqualTo("subject-1");
		});
	}

	@Test
	void rejectsAnAssertionThatDoesNotContainTheConfiguredStableSubject() {
		CompleteRedirectAuthenticationUseCase useCase = new CompleteRedirectAuthenticationUseCase(
				registry(enabledProvider()), identity -> {
					throw new AssertionError("normalization must not run");
				}, events::add, () -> "trace-123", clock);
		String providerId = PROVIDER_ID.value();
		Map<String, Object> attributes = Map.of("emailaddress", "maria@example.com");

		assertThatThrownBy(() -> useCase.completeSaml(providerId, "fallback-name-id", attributes))
				.isInstanceOf(FederatedIdentityMappingException.class)
				.hasMessageNotContaining("maria@example.com");
		assertThat(events).isEmpty();
	}

	@Test
	void acceptsCollectionAndArraySubjectsWhileIgnoringBlankNameIds() {
		AtomicReference<FederatedIdentity> normalizedInput = new AtomicReference<>();
		PlatformIdentity expected = new PlatformIdentity("subject-1", "maria", null, "maria",
				PROVIDER_ID.value(), Set.of(), Set.of(), Set.of(), Map.of());
		CompleteRedirectAuthenticationUseCase useCase = new CompleteRedirectAuthenticationUseCase(
				registry(enabledProvider()), identity -> {
					normalizedInput.set(identity);
					return expected;
				}, events::add, () -> "trace-123", clock);

		useCase.completeSaml(PROVIDER_ID.value(), " ", Map.of("objectidentifier", List.of(" collection-id ")));
		assertThat(normalizedInput.get().externalSubject()).isEqualTo("collection-id");
		assertThat(normalizedInput.get().attributes()).doesNotContainKey("NameID");

		useCase.completeSaml(PROVIDER_ID.value(), null, Map.of("objectidentifier", new String[] { " array-id " }));
		assertThat(normalizedInput.get().externalSubject()).isEqualTo("array-id");
	}

	@Test
	void rejectsMissingUnavailableAndWrongProtocolProviders() {
		IdentityProviderDefinition draft = IdentityProviderDefinition.draft(PROVIDER_ID, "Microsoft Entra ID",
				ProviderType.SAML, 0, Map.of(), Map.of("subject", "objectidentifier"), Instant.EPOCH);
		IdentityProviderDefinition oidc = IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"),
				"Corporate OIDC", ProviderType.OIDC, 0, Map.of(), Map.of("subject", "sub"), Instant.EPOCH);
		oidc.markValidated(Instant.EPOCH.plusSeconds(1));
		oidc.enable(Instant.EPOCH.plusSeconds(2));
		CompleteRedirectAuthenticationUseCase unavailable = useCaseFor(draft);
		CompleteRedirectAuthenticationUseCase wrongType = useCaseFor(oidc);
		CompleteRedirectAuthenticationUseCase missing = new CompleteRedirectAuthenticationUseCase(
				registry(null), identity -> { throw new AssertionError(); }, events::add, () -> "trace-123", clock);

		String samlProviderId = PROVIDER_ID.value();
		String oidcProviderId = "corporate-oidc";
		Map<String, Object> noAttributes = Map.of();
		assertThatThrownBy(() -> unavailable.completeSaml(samlProviderId, null, noAttributes))
				.isInstanceOf(ProviderNotAvailableForLoginException.class);
		assertThatThrownBy(() -> wrongType.completeSaml(oidcProviderId, null, noAttributes))
				.isInstanceOf(ProviderNotAvailableForLoginException.class);
		assertThatThrownBy(() -> missing.completeSaml(samlProviderId, null, noAttributes))
				.isInstanceOf(com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException.class);
	}

	private CompleteRedirectAuthenticationUseCase useCaseFor(IdentityProviderDefinition provider) {
		return new CompleteRedirectAuthenticationUseCase(registry(provider),
				identity -> { throw new AssertionError(); }, events::add, () -> "trace-123", clock);
	}

	private static IdentityProviderDefinition enabledProvider() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(PROVIDER_ID, "Microsoft Entra ID",
				ProviderType.SAML, 0, Map.of("registration-id", PROVIDER_ID.value()),
				Map.of("subject", "objectidentifier", "username", "emailaddress", "email", "emailaddress",
						"displayName", "name", "groups", "groups"), Instant.EPOCH);
		provider.markValidated(Instant.EPOCH.plusSeconds(1));
		provider.enable(Instant.EPOCH.plusSeconds(2));
		return provider;
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
				return provider != null && provider.id().equals(providerId) ? Optional.of(provider) : Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return provider == null ? List.of() : List.of(provider);
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider != null && provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}
}
