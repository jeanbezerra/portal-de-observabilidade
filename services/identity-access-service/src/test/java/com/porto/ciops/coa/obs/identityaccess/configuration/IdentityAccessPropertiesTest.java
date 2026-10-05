package com.porto.ciops.coa.obs.identityaccess.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.Test;

class IdentityAccessPropertiesTest {

	@Test
	void acceptsASecureProductionConfiguration() {
		IdentityAccessProperties properties = properties(true, true, URI.create("https://identity.example"),
				Duration.ofMinutes(5), true, "https://identity.example/jwks", List.of("https://portal.example"));

		assertThat(properties.isProductionConfigurationSecure()).isTrue();
		assertThat(properties.session().areDurationsValid()).isTrue();
		assertThat(properties.session().isSameSiteConfigurationValid()).isTrue();
		assertThat(properties.token().isResourceServerConfigurationValid()).isTrue();
		assertThat(properties.token().isAccessTokenTtlValid()).isTrue();
		assertThat(properties.security().areAllowedOriginsValid()).isTrue();
	}

	@Test
	void rejectsUnsafeProductionSettings() {
		assertThat(properties(true, false, URI.create("http://identity.example"), Duration.ZERO, true,
				"http://identity.example/jwks", List.of("http://portal.example"))
				.isProductionConfigurationSecure()).isFalse();
		assertThat(properties(true, true, URI.create("https://identity.example"), Duration.ofMinutes(5), false,
				null, List.of("http://portal.example")).isProductionConfigurationSecure()).isFalse();
	}

	@Test
	void acceptsDevelopmentAndDisabledResourceServerConfigurations() {
		IdentityAccessProperties properties = properties(false, false, URI.create("http://localhost:8080"),
				Duration.ofMinutes(5), false, null, List.of("http://localhost:5173"));

		assertThat(properties.isProductionConfigurationSecure()).isTrue();
		assertThat(properties.token().isResourceServerConfigurationValid()).isTrue();
		assertThat(properties.token().isAccessTokenTtlValid()).isTrue();
	}

	@Test
	void validatesSessionAndTokenBoundaries() {
		IdentityAccessProperties.Session shortMaximum = new IdentityAccessProperties.Session(
				Duration.ofMinutes(10), Duration.ofMinutes(5), "SESSION", true, "lax");
		IdentityAccessProperties.Session noneWithoutTls = new IdentityAccessProperties.Session(
				Duration.ofMinutes(5), Duration.ofMinutes(10), "SESSION", false, "none");
		IdentityAccessProperties.Token relativeIssuer = new IdentityAccessProperties.Token(
				URI.create("/identity"), "portal", Duration.ofMinutes(5), false, null);
		IdentityAccessProperties.Token negativeTtl = new IdentityAccessProperties.Token(
				URI.create("https://identity.example"), "portal", Duration.ofSeconds(-1), false, null);

		assertThat(shortMaximum.areDurationsValid()).isFalse();
		assertThat(noneWithoutTls.isSameSiteConfigurationValid()).isFalse();
		assertThat(relativeIssuer.isAccessTokenTtlValid()).isFalse();
		assertThat(negativeTtl.isAccessTokenTtlValid()).isFalse();
	}

	@Test
	void rejectsBlankWildcardAndNullOrigins() {
		assertThat(new IdentityAccessProperties.Security(false, List.of(" ")).areAllowedOriginsValid()).isFalse();
		assertThat(new IdentityAccessProperties.Security(false, List.of("*")).areAllowedOriginsValid()).isFalse();
		assertThat(new IdentityAccessProperties.Security(false, null).allowedOrigins()).isEmpty();
	}

	private static IdentityAccessProperties properties(boolean production, boolean secureCookie, URI issuer,
			Duration tokenTtl, boolean resourceServer, String jwkSetUri, List<String> origins) {
		return new IdentityAccessProperties(
				new IdentityAccessProperties.Session(Duration.ofMinutes(5), Duration.ofHours(8), "OBS_SESSION",
						secureCookie, secureCookie ? "none" : "lax"),
				new IdentityAccessProperties.Token(issuer, "portal", tokenTtl, resourceServer, jwkSetUri),
				new IdentityAccessProperties.Security(production, origins));
	}
}
