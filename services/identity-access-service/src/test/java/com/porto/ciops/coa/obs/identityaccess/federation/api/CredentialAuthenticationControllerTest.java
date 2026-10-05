package com.porto.ciops.coa.obs.identityaccess.federation.api;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.federation.application.AuthenticateWithCredentialsUseCase;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationResult;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import tools.jackson.databind.json.JsonMapper;

class CredentialAuthenticationControllerTest {

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void deserializesCredentialsAsAnErasableCharacterArray() throws Exception {
		CredentialAuthenticationController.CredentialLoginRequest request = JsonMapper.builder().build().readValue(
				"{\"username\":\"maria\",\"credential\":\"password\"}",
				CredentialAuthenticationController.CredentialLoginRequest.class);

		assertThat(request.username()).isEqualTo("maria");
		assertThat(request.credential()).containsExactly("password".toCharArray());
		request.eraseCredential();
		assertThat(request.credential()).containsOnly('\0');
	}

	@Test
	void comparesCredentialRequestsByArrayContentWithoutExposingTheCredential() {
		CredentialAuthenticationController.CredentialLoginRequest request =
				new CredentialAuthenticationController.CredentialLoginRequest("maria", "password".toCharArray());
		CredentialAuthenticationController.CredentialLoginRequest same =
				new CredentialAuthenticationController.CredentialLoginRequest("maria", "password".toCharArray());
		CredentialAuthenticationController.CredentialLoginRequest otherUser =
				new CredentialAuthenticationController.CredentialLoginRequest("joao", "password".toCharArray());
		CredentialAuthenticationController.CredentialLoginRequest otherCredential =
				new CredentialAuthenticationController.CredentialLoginRequest("maria", "different".toCharArray());

		assertThat(request).isEqualTo(same).hasSameHashCodeAs(same)
				.isNotEqualTo(otherUser).isNotEqualTo(otherCredential).isNotEqualTo("maria");
		assertThat(request.toString()).contains("maria", "[REDACTED]").doesNotContain("password");
	}

	@Test
	void safelyHandlesANullCredentialUntilBeanValidationRejectsIt() {
		CredentialAuthenticationController.CredentialLoginRequest request =
				new CredentialAuthenticationController.CredentialLoginRequest("maria", null);

		request.eraseCredential();

		assertThat(request.credential()).isNull();
		assertThat(request.hashCode()).isNotZero();
	}

	@Test
	void createsASessionWithOnlyNormalizedRolesAndPermissions() {
		PlatformIdentity identity = new PlatformIdentity("subject-1", "maria", "maria@example.com", "Maria",
				"corporate-ldap", Set.of("external-admins"), Set.of("OBS_OPERATOR"), Set.of("job:read"),
				Map.of("department", "operations"));
		IdentityProviderDefinition provider = enabledProvider();
		FederatedIdentity federated = new FederatedIdentity("maria", provider.id(), ProviderType.LDAP,
				Map.of("uid", "maria"));
		AuthenticateWithCredentialsUseCase useCase = new AuthenticateWithCredentialsUseCase(registry(provider),
				(ignoredProvider, credentials) -> AuthenticationResult.success(federated), ignored -> identity,
				event -> { }, () -> "trace-123",
				Clock.fixed(Instant.parse("2026-10-05T00:00:00Z"), ZoneOffset.UTC));
		HttpSessionSecurityContextRepository repository = new HttpSessionSecurityContextRepository();
		CredentialAuthenticationController controller = new CredentialAuthenticationController(useCase, repository,
				new ChangeSessionIdAuthenticationStrategy());
		MockHttpServletRequest request = new MockHttpServletRequest();
		MockHttpServletResponse response = new MockHttpServletResponse();
		CredentialAuthenticationController.CredentialLoginRequest body =
				new CredentialAuthenticationController.CredentialLoginRequest("maria", "password".toCharArray());

		CredentialAuthenticationController.LoginResponse login = controller.login("corporate-ldap", body,
				request, response);

		SecurityContext context = (SecurityContext) request.getSession().getAttribute(
				HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
		assertThat(login.subject()).isEqualTo("subject-1");
		assertThat(context.getAuthentication().getName()).isEqualTo("subject-1");
		assertThat(context.getAuthentication().getAuthorities()).extracting("authority")
				.containsExactlyInAnyOrder("job:read", "ROLE_OBS_OPERATOR")
				.doesNotContain("external-admins");
		assertThat(body.credential()).containsOnly('\0');
	}

	private static IdentityProviderDefinition enabledProvider() {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-ldap"),
				"Corporate LDAP", ProviderType.LDAP, 0, Map.of(), Map.of(), Instant.EPOCH);
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
				return List.of(provider);
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}
}
