package com.porto.ciops.coa.obs.identityaccess.configuration;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "obs.identity")
public record IdentityAccessProperties(
		@Valid @NotNull Session session,
		@Valid @NotNull Token token,
		@Valid @NotNull Security security) {

	@AssertTrue(message = "production mode requires secure cookies, HTTPS issuer and HTTPS CORS origins")
	public boolean isProductionConfigurationSecure() {
		if (session == null || token == null || security == null || !security.productionMode()) {
			return true;
		}
		if (!session.secureCookie() || !hasHttpsIssuer(token)) {
			return false;
		}
		return security.allowedOrigins().stream().allMatch(origin -> origin.startsWith("https://"));
	}

	private static boolean hasHttpsIssuer(Token token) {
		return token.issuer() != null && "https".equalsIgnoreCase(token.issuer().getScheme());
	}

	public record Session(
			@NotNull Duration inactivityTimeout,
			@NotNull Duration maximumLifetime,
			@NotBlank String cookieName,
			boolean secureCookie,
			@NotBlank @Pattern(regexp = "(?i)strict|lax|none") String sameSite) {

		@AssertTrue(message = "session durations must be greater than zero")
		public boolean areDurationsValid() {
			return isPositive(inactivityTimeout) && isPositive(maximumLifetime)
					&& maximumLifetime.compareTo(inactivityTimeout) >= 0;
		}

		private static boolean isPositive(Duration duration) {
			return duration != null && !duration.isZero() && !duration.isNegative();
		}

		@AssertTrue(message = "SameSite=None requires secure cookies")
		public boolean isSameSiteConfigurationValid() {
			return !"none".equalsIgnoreCase(sameSite) || secureCookie;
		}
	}

	public record Token(
			@NotNull URI issuer,
			@NotBlank String audience,
			@NotNull Duration accessTokenTtl,
			boolean resourceServerEnabled,
			String jwkSetUri) {

		@AssertTrue(message = "jwk-set-uri must use HTTPS when the resource server is enabled")
		public boolean isResourceServerConfigurationValid() {
			return !resourceServerEnabled || (jwkSetUri != null && jwkSetUri.startsWith("https://"));
		}

		@AssertTrue(message = "access-token-ttl must be greater than zero")
		public boolean isAccessTokenTtlValid() {
			return accessTokenTtl != null && !accessTokenTtl.isZero() && !accessTokenTtl.isNegative()
					&& hasSupportedIssuer();
		}

		private boolean hasSupportedIssuer() {
			if (issuer == null || !issuer.isAbsolute()) {
				return false;
			}
			return "http".equalsIgnoreCase(issuer.getScheme())
					|| "https".equalsIgnoreCase(issuer.getScheme());
		}
	}

	public record Security(boolean productionMode, @NotEmpty List<String> allowedOrigins) {
		public Security {
			allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
		}

		@AssertTrue(message = "CORS origins must not be blank or use a wildcard when credentials are enabled")
		public boolean areAllowedOriginsValid() {
			return allowedOrigins.stream().allMatch(Security::isAllowedOrigin);
		}

		private static boolean isAllowedOrigin(String origin) {
			return origin != null && !origin.isBlank() && !"*".equals(origin);
		}
	}
}
