package com.porto.ciops.coa.obs.identityaccess.secrets.domain;

import java.net.URI;
import java.util.Objects;

public record SecretReference(String value) {

	public SecretReference {
		value = Objects.requireNonNull(value, "value").trim();
		URI uri = URI.create(value);
		if (!hasSecretScheme(value, uri) || !hasAuthorityAndPath(uri) || hasForbiddenComponents(uri)) {
			throw new IllegalArgumentException("Secret references must use the secret:// scheme");
		}
	}

	private static boolean hasSecretScheme(String value, URI uri) {
		return value.startsWith("secret://") && "secret".equalsIgnoreCase(uri.getScheme());
	}

	private static boolean hasAuthorityAndPath(URI uri) {
		return uri.getHost() != null && !uri.getHost().isBlank() && !uri.getPath().isBlank();
	}

	private static boolean hasForbiddenComponents(URI uri) {
		return uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null;
	}

	@Override
	public String toString() {
		return "SecretReference[value=[REDACTED]]";
	}
}
