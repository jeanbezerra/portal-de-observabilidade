package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import tools.jackson.databind.json.JsonMapper;

class SamlInfrastructureComponentsTest {

	@Test
	void returnsAnRfc7807ResponseAndAuditsSamlFailures() throws Exception {
		List<AuditEvent> events = new ArrayList<>();
		SamlAuthenticationFailureHandler handler = new SamlAuthenticationFailureHandler(events::add,
				() -> "trace-123", Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), JsonMapper.builder().build());
		MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login/saml2/sso/corporate-entra");
		MockHttpServletResponse response = new MockHttpServletResponse();

		handler.onAuthenticationFailure(request, response, new BadCredentialsException("invalid assertion"));

		assertThat(response.getStatus()).isEqualTo(401);
		assertThat(response.getContentAsString()).contains("authentication-failed", "trace-123")
				.doesNotContain("invalid assertion");
		assertThat(events).singleElement().satisfies(event -> {
			assertThat(event.providerId()).isEqualTo("corporate-entra");
			assertThat(event.outcome()).isEqualTo("FAILURE");
		});
	}

	@Test
	void keepsTheFailureResponseAvailableWhenAuditStorageIsOffline() throws Exception {
		SamlAuthenticationFailureHandler handler = new SamlAuthenticationFailureHandler(
				event -> { throw new IllegalStateException("offline"); }, () -> "trace-123",
				Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), JsonMapper.builder().build());
		MockHttpServletResponse response = new MockHttpServletResponse();

		handler.onAuthenticationFailure(new MockHttpServletRequest("POST", "/unexpected"), response,
				new BadCredentialsException("invalid"));

		assertThat(response.getStatus()).isEqualTo(401);
	}

	@Test
	void buildsOnlyRedirectsBackedByAnAvailableRegistration() {
		RelyingPartyRegistrationRepository registrations = mock(RelyingPartyRegistrationRepository.class);
		RelyingPartyRegistration registration = mock(RelyingPartyRegistration.class);
		IdentityProviderDefinition provider = samlProvider();
		when(registrations.findByRegistrationId("corporate-entra")).thenReturn(registration);
		SpringSamlRedirectAuthenticationGateway gateway = new SpringSamlRedirectAuthenticationGateway(registrations);

		AuthenticationRedirect redirect = gateway.begin(provider);

		assertThat(redirect.location()).hasToString("/saml2/authenticate/corporate-entra");
		assertThat(redirect.state()).isEmpty();
		when(registrations.findByRegistrationId("corporate-entra")).thenReturn(null);
		assertThatThrownBy(() -> gateway.begin(provider))
				.isInstanceOf(ProviderAuthenticationUnavailableException.class);
	}

	@Test
	void refusesInsecureMetadataEndpointsBeforeMakingARequest() {
		HttpsSamlMetadataLoader loader = new HttpsSamlMetadataLoader();
		URI metadataUri = URI.create("http://metadata.example/idp.xml");
		Duration timeout = Duration.ofSeconds(1);

		assertThatThrownBy(() -> loader.load(metadataUri, timeout, timeout, 1024))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("HTTPS");
	}

	@Test
	void rejectsInvalidDisabledAndUnavailableDynamicRegistrations() {
		IdentityProviderDefinition saml = samlProvider();
		SamlProviderRegistrationFactory unavailableFactory = new SamlProviderRegistrationFactory(
				(uri, connectTimeout, requestTimeout, maximumBytes) -> {
					throw new IllegalStateException("metadata offline");
				}, reference -> {
					throw new AssertionError("no credential should be loaded");
				});
		DynamicSamlRelyingPartyRegistrationRepository unavailable =
				new DynamicSamlRelyingPartyRegistrationRepository(registry(saml), unavailableFactory,
						Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

		assertThat(unavailable.findByRegistrationId("invalid id")).isNull();
		assertThat(unavailable.findByRegistrationId("corporate-entra")).isNull();
		assertThat(unavailable.iterator()).isExhausted();

		IdentityProviderDefinition oidc = IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"),
				"Corporate OIDC", ProviderType.OIDC, 0, Map.of(), Map.of(), Instant.EPOCH);
		oidc.markValidated(Instant.EPOCH.plusSeconds(1));
		oidc.enable(Instant.EPOCH.plusSeconds(2));
		DynamicSamlRelyingPartyRegistrationRepository wrongType =
				new DynamicSamlRelyingPartyRegistrationRepository(registry(oidc), unavailableFactory,
						Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
		assertThat(wrongType.findByRegistrationId("corporate-oidc")).isNull();
	}

	private static IdentityProviderDefinition samlProvider() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-entra"),
				"Corporate Entra", ProviderType.SAML, 0,
				Map.of("registration-id", "corporate-entra"), Map.of("subject", "sub", "username", "email"),
				Instant.EPOCH);
		provider.markValidated(Instant.EPOCH.plusSeconds(1));
		provider.enable(Instant.EPOCH.plusSeconds(2));
		return provider;
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
				return provider.id().equals(providerId) ? Optional.of(provider) : Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return provider.status() == com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus.ENABLED
						? List.of(provider) : List.of();
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}
}
