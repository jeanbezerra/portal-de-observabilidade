package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.util.Arrays;

public final class CredentialAuthenticationRequest implements AutoCloseable {

	private final String username;
	private final char[] credential;

	public CredentialAuthenticationRequest(String username, char[] credential) {
		if (username == null || username.isBlank() || credential == null || credential.length == 0) {
			throw new IllegalArgumentException("username and credential are required");
		}
		this.username = username;
		this.credential = credential.clone();
	}

	public String username() {
		return username;
	}

	public char[] credential() {
		return credential.clone();
	}

	@Override
	public void close() {
		Arrays.fill(credential, '\0');
	}

	@Override
	public String toString() {
		return "CredentialAuthenticationRequest[username=%s, credential=[REDACTED]]".formatted(username);
	}
}
