package com.porto.ciops.coa.obs.identityaccess.secrets.domain;

import java.util.Arrays;

public final class SecretValue implements AutoCloseable {

	private final char[] value;

	public SecretValue(char[] value) {
		this.value = value.clone();
	}

	public char[] reveal() {
		return value.clone();
	}

	@Override
	public void close() {
		Arrays.fill(value, '\0');
	}

	@Override
	public String toString() {
		return "SecretValue[value=[REDACTED]]";
	}
}
