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

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationResult;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationGateway;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationRequest;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class AuthenticateWithCredentialsUseCaseTest {

	private static final ProviderId PROVIDER_ID = new ProviderId("corporate-ldap");
	private final List<AuditEvent> events = new ArrayList<>();
	private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void normalizesSuccessfulAuthenticationAndAuditsIt() {
		FederatedIdentity federated = new FederatedIdentity("user-1", PROVIDER_ID, ProviderType.LDAP,
				Map.of("uid", "maria"));
		CredentialAuthenticationGateway gateway = (provider, request) -> AuthenticationResult.success(federated);
		PlatformIdentity expected = identity();
		AuthenticateWithCredentialsUseCase useCase = useCase(gateway, expected);

		PlatformIdentity result;
		try (CredentialAuthenticationRequest request = new CredentialAuthenticationRequest("maria",
				"valid".toCharArray())) {
			result = useCase.authenticate(PROVIDER_ID.value(), request);
		}

		assertThat(result).isEqualTo(expected);
		assertThat(events).singleElement().satisfies(event -> {
			assertThat(event.eventType()).isEqualTo("authentication.succeeded");
			assertThat(event.actorSubject()).isEqualTo(expected.subject());
		});
	}

	@Test
	void failsSafelyAndAuditsInvalidCredentials() {
		CredentialAuthenticationGateway gateway = (provider, request) ->
				AuthenticationResult.failure("invalid-credentials");
		AuthenticateWithCredentialsUseCase useCase = useCase(gateway, identity());
		String providerId = PROVIDER_ID.value();

		try (CredentialAuthenticationRequest request = new CredentialAuthenticationRequest("maria",
				"invalid".toCharArray())) {
			assertThatThrownBy(() -> useCase.authenticate(providerId, request))
					.isInstanceOf(AuthenticationFailedException.class)
					.hasMessageNotContaining("maria");
		}

		assertThat(events).singleElement().satisfies(event -> {
			assertThat(event.eventType()).isEqualTo("authentication.failed");
			assertThat(event.outcome()).isEqualTo("FAILURE");
			assertThat(event.sourceContext()).isEqualTo("invalid-credentials");
		});
	}

	private AuthenticateWithCredentialsUseCase useCase(CredentialAuthenticationGateway gateway,
			PlatformIdentity normalized) {
		return new AuthenticateWithCredentialsUseCase(registry(enabledProvider()), gateway,
				identity -> normalized, events::add, () -> "trace-123", clock);
	}

	private static IdentityProviderDefinition enabledProvider() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(PROVIDER_ID, "Corporate LDAP",
				ProviderType.LDAP, 0, Map.of(), Map.of(), Instant.EPOCH);
		provider.markValidated(Instant.EPOCH.plusSeconds(1));
		provider.enable(Instant.EPOCH.plusSeconds(2));
		return provider;
	}

	private static PlatformIdentity identity() {
		return new PlatformIdentity("subject-1", "maria", "maria@example.com", "Maria", PROVIDER_ID.value(),
				Set.of("ops"), Set.of("OBS_OPERATOR"), Set.of("job:read"), Map.of("department", "operations"));
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
				return provider.id().equals(providerId) ? Optional.of(provider) : Optional.empty();
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
