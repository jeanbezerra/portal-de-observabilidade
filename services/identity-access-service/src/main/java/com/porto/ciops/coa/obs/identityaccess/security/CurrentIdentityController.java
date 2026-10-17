package com.porto.ciops.coa.obs.identityaccess.security;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
class CurrentIdentityController {

	private final IdentityAccessProperties properties;
	private final Clock clock;

	CurrentIdentityController(IdentityAccessProperties properties, Clock clock) {
		this.properties = properties;
		this.clock = clock;
	}

	@GetMapping
	CurrentIdentityResponse current(Authentication authentication, HttpServletRequest request) {
		SessionResponse session = sessionResponse(request.getSession(false));
		List<String> authorities = authentication.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority).sorted().toList();
		Map<String, Object> attributes = publicAttributes(authentication.getPrincipal());
		if (authentication.getPrincipal() instanceof PlatformPrincipal principal) {
			return new CurrentIdentityResponse(principal.subject(), principal.username(), principal.email(),
					principal.displayName(), principal.providerId(), principal.roles(), principal.permissions(),
					authorities, attributes, session);
		}
		return new CurrentIdentityResponse(authentication.getName(), authentication.getName(), null,
				authentication.getName(), null, java.util.Set.of(), java.util.Set.of(), authorities, attributes, session);
	}

	private SessionResponse sessionResponse(HttpSession session) {
		if (session == null) {
			return null;
		}
		Instant checkedAt = clock.instant();
		Instant absoluteExpiresAt = Instant.ofEpochMilli(session.getCreationTime())
				.plus(properties.session().maximumLifetime());
		Instant idleExpiresAt = checkedAt.plusSeconds(session.getMaxInactiveInterval());
		Instant expiresAt = session.getMaxInactiveInterval() <= 0 || absoluteExpiresAt.isBefore(idleExpiresAt)
				? absoluteExpiresAt : idleExpiresAt;
		return new SessionResponse(checkedAt, expiresAt, absoluteExpiresAt);
	}

	private static Map<String, Object> publicAttributes(Object principal) {
		if (principal instanceof PlatformPrincipal platformPrincipal) {
			return platformPrincipal.attributes();
		}
		return oauthAttributes(principal);
	}

	private static Map<String, Object> oauthAttributes(Object principal) {
		if (principal instanceof OAuth2AuthenticatedPrincipal oauth) {
			return oauth.getAttributes().entrySet().stream()
					.filter(entry -> !isSensitive(entry.getKey()))
					.collect(java.util.stream.Collectors.toUnmodifiableMap(Map.Entry::getKey, Map.Entry::getValue));
		}
		return Map.of();
	}

	private static boolean isSensitive(String key) {
		String normalized = key.toLowerCase(Locale.ROOT);
		return normalized.contains("token") || normalized.contains("secret")
				|| normalized.contains("password") || normalized.contains("assertion");
	}

	record CurrentIdentityResponse(String subject, String username, String email, String displayName,
			String providerId, java.util.Set<String> roles, java.util.Set<String> permissions,
			List<String> authorities, Map<String, Object> attributes, SessionResponse session) {
	}

	record SessionResponse(Instant checkedAt, Instant expiresAt, Instant absoluteExpiresAt) {
	}
}
