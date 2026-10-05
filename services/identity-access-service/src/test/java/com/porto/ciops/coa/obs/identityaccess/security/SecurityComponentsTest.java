package com.porto.ciops.coa.obs.identityaccess.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml.SamlSecurityConfiguration;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.config.ObjectPostProcessor;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.csrf.DefaultCsrfToken;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.context.support.GenericApplicationContext;
import tools.jackson.databind.json.JsonMapper;

class SecurityComponentsTest {
	private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-10-05T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void returnsTheNormalizedPlatformIdentity() {
		PlatformIdentity identity = identity();
		CurrentIdentityController controller = new CurrentIdentityController();

		CurrentIdentityController.CurrentIdentityResponse response = controller.current(
				PlatformAuthenticationFactory.authenticated(identity));

		assertThat(response.subject()).isEqualTo("subject-1");
		assertThat(response.roles()).containsExactly("OBS_OPERATOR");
		assertThat(response.permissions()).containsExactly("job:read");
		assertThat(response.authorities()).containsExactly("ROLE_OBS_OPERATOR", "job:read");
		assertThat(response.attributes()).containsEntry("department", "operations");
	}

	@Test
	void removesSensitiveAttributesFromOauthPrincipals() {
		DefaultOAuth2User principal = new DefaultOAuth2User(
				List.of(new SimpleGrantedAuthority("profile:read")),
				Map.of("sub", "subject-2", "department", "operations", "access_token", "secret"), "sub");
		TestingAuthenticationToken authentication = new TestingAuthenticationToken(principal, null,
				new SimpleGrantedAuthority("profile:read"));

		CurrentIdentityController.CurrentIdentityResponse response =
				new CurrentIdentityController().current(authentication);

		assertThat(response.subject()).isEqualTo("subject-2");
		assertThat(response.attributes()).containsEntry("department", "operations").doesNotContainKey("access_token");
	}

	@Test
	void fallsBackToTheAuthenticationNameForOtherPrincipals() {
		TestingAuthenticationToken authentication = new TestingAuthenticationToken("service-account", null);

		CurrentIdentityController.CurrentIdentityResponse response =
				new CurrentIdentityController().current(authentication);

		assertThat(response.subject()).isEqualTo("service-account");
		assertThat(response.attributes()).isEmpty();
	}

	@Test
	void expiresSessionsThatExceedTheAbsoluteLifetime() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/me");
		MockHttpSession session = (MockHttpSession) request.getSession();
		Clock clock = Clock.fixed(Instant.ofEpochMilli(session.getCreationTime()).plus(Duration.ofHours(9)),
				ZoneOffset.UTC);
		AbsoluteSessionLifetimeFilter filter = new AbsoluteSessionLifetimeFilter(properties(), clock,
				JsonMapper.builder().build(), () -> "trace-123");
		MockHttpServletResponse response = new MockHttpServletResponse();
		AtomicBoolean continued = new AtomicBoolean();

		filter.doFilterInternal(request, response, (ignoredRequest, ignoredResponse) -> continued.set(true));

		assertThat(response.getStatus()).isEqualTo(401);
		assertThat(response.getContentAsString()).contains("session-expired", "trace-123");
		assertThat(continued).isFalse();
	}

	@Test
	void continuesRequestsWithFreshOrMissingSessions() throws Exception {
		AbsoluteSessionLifetimeFilter filter = new AbsoluteSessionLifetimeFilter(properties(), FIXED_CLOCK,
				JsonMapper.builder().build(), () -> "trace-123");
		AtomicBoolean continued = new AtomicBoolean();

		filter.doFilterInternal(new MockHttpServletRequest(), new MockHttpServletResponse(),
				(ignoredRequest, ignoredResponse) -> continued.set(true));

		assertThat(continued).isTrue();
	}

	@Test
	void publishesLogoutAuditsAndDoesNotBreakLogoutWhenAuditingFails() {
		List<com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent> events = new java.util.ArrayList<>();
		AuditedLogoutHandler handler = new AuditedLogoutHandler(events::add, () -> "trace-123",
				Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
		var authentication = PlatformAuthenticationFactory.authenticated(identity());

		handler.logout(new MockHttpServletRequest(), new MockHttpServletResponse(), authentication);
		handler.logout(new MockHttpServletRequest(), new MockHttpServletResponse(), null);
		new AuditedLogoutHandler(event -> { throw new IllegalStateException("offline"); }, () -> "trace-123",
				Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
				.logout(new MockHttpServletRequest(), new MockHttpServletResponse(), authentication);

		assertThat(events).singleElement().satisfies(event -> {
			assertThat(event.eventType()).isEqualTo("authentication.logout");
			assertThat(event.providerId()).isEqualTo("corporate-ldap");
		});
	}

	@Test
	void exposesCsrfAndCorsContracts() {
		CsrfController.CsrfResponse csrf = new CsrfController().csrf(
				new DefaultCsrfToken("X-CSRF-TOKEN", "_csrf", "token-123"));
		ApiSecurityConfiguration configuration = new ApiSecurityConfiguration();
		IdentityAccessProperties properties = properties();
		CorsConfiguration cors = configuration.corsConfigurationSource(properties)
				.getCorsConfiguration(new MockHttpServletRequest());

		assertThat(csrf.token()).isEqualTo("token-123");
		assertThat(cors).isNotNull();
		assertThat(cors.getAllowedOrigins()).containsExactly("https://portal.example");
		assertThat(cors.getAllowedMethods()).contains("GET", "POST", "OPTIONS");
		assertThat(cors.getAllowCredentials()).isTrue();
		assertThat(configuration.securityContextRepository()).isNotNull();
		assertThat(configuration.sessionAuthenticationStrategy()).isNotNull();
		AbsoluteSessionLifetimeFilter filter = new AbsoluteSessionLifetimeFilter(properties, FIXED_CLOCK,
				JsonMapper.builder().build(), () -> "trace-123");
		assertThat(configuration.disableContainerFilterRegistration(filter).isEnabled()).isFalse();
	}

	@Test
	void createsAResourceServerJwtDecoderWithoutFetchingKeysEagerly() {
		IdentityAccessProperties base = properties();
		IdentityAccessProperties enabled = new IdentityAccessProperties(base.session(),
				new IdentityAccessProperties.Token(base.token().issuer(), base.token().audience(),
						base.token().accessTokenTtl(), true, "https://identity.example/jwks"), base.security());

		assertThat(new JwtDecoderConfiguration().jwtDecoder(enabled)).isNotNull();
		assertThat(new JwtDecoderConfiguration().jwtAuthenticationConverter()).isNotNull();
	}

	@Test
	void validatesJwtAudiencesAndWritesStableProblemResponses() throws Exception {
		Jwt accepted = Jwt.withTokenValue("token").header("alg", "none")
				.claim("aud", List.of("portal", "service")).build();
		Jwt rejected = Jwt.withTokenValue("token").header("alg", "none")
				.claim("sub", "subject-1").build();
		MockHttpServletResponse response = new MockHttpServletResponse();

		assertThat(JwtDecoderConfiguration.validateAudience(accepted, "portal").hasErrors()).isFalse();
		assertThat(JwtDecoderConfiguration.validateAudience(rejected, "portal").hasErrors()).isTrue();
		ApiSecurityConfiguration.writeProblem(JsonMapper.builder().build(), response, 403,
				"Access denied", "access-denied", "/api/v1/admin", "trace-123");

		assertThat(response.getStatus()).isEqualTo(403);
		assertThat(response.getContentAsString()).contains("access-denied", "/api/v1/admin", "trace-123");
	}

	@Test
	void buildsTheSessionBasedSecurityFilterChain() throws Exception {
		ObjectPostProcessor<Object> postProcessor = new ObjectPostProcessor<>() {
			@Override
			public <T> T postProcess(T object) {
				return object;
			}
		};
		try (GenericApplicationContext applicationContext = new GenericApplicationContext()) {
			ApiSecurityConfiguration configuration = new ApiSecurityConfiguration();
			IdentityAccessProperties properties = properties();
			applicationContext.registerBean("corsConfigurationSource",
					org.springframework.web.cors.CorsConfigurationSource.class,
					() -> configuration.corsConfigurationSource(properties));
			applicationContext.refresh();
			AuthenticationManagerBuilder authenticationBuilder =
					new AuthenticationManagerBuilder(postProcessor);
			Map<Class<?>, Object> sharedObjects = new HashMap<>();
			sharedObjects.put(org.springframework.context.ApplicationContext.class, applicationContext);
			sharedObjects.put(org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher.Builder.class,
					org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher.withDefaults());
			HttpSecurity http = new HttpSecurity(postProcessor, authenticationBuilder, sharedObjects);
			var contextRepository = configuration.securityContextRepository();
			var sessionStrategy = configuration.sessionAuthenticationStrategy();
			AbsoluteSessionLifetimeFilter lifetimeFilter = new AbsoluteSessionLifetimeFilter(properties,
					FIXED_CLOCK, JsonMapper.builder().build(), () -> "trace-123");
			AuditedLogoutHandler logoutHandler = new AuditedLogoutHandler(event -> { }, () -> "trace-123",
					FIXED_CLOCK);

			assertThat(configuration.apiSecurityFilterChain(http, properties, lifetimeFilter,
					JsonMapper.builder().build(), () -> "trace-123", contextRepository, sessionStrategy,
					logoutHandler, mock(SamlSecurityConfiguration.class),
					new JwtDecoderConfiguration().jwtAuthenticationConverter())).isNotNull();
		}
	}

	private static PlatformIdentity identity() {
		return new PlatformIdentity("subject-1", "maria", "maria@example.com", "Maria", "corporate-ldap",
				Set.of("external-ops"), Set.of("OBS_OPERATOR"), Set.of("job:read"),
				Map.of("department", "operations"));
	}

	private static IdentityAccessProperties properties() {
		return new IdentityAccessProperties(
				new IdentityAccessProperties.Session(Duration.ofMinutes(30), Duration.ofHours(8), "OBS_SESSION",
						true, "lax"),
				new IdentityAccessProperties.Token(URI.create("https://identity.example"), "portal",
						Duration.ofMinutes(5), false, null),
				new IdentityAccessProperties.Security(true, List.of("https://portal.example")));
	}
}
