package com.porto.ciops.coa.obs.identityaccess.token.domain;

import java.time.Instant;

public record IssuedToken(String value, Instant expiresAt) {
	@Override
	public String toString() {
		return "IssuedToken[value=[REDACTED], expiresAt=%s]".formatted(expiresAt);
	}
}
