package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

public record ProviderId(String value) {

	private static final Pattern VALID_VALUE = Pattern.compile("[a-z][a-z0-9-]{2,62}");

	public ProviderId {
		value = Objects.requireNonNull(value, "value").trim().toLowerCase(Locale.ROOT);
		if (!VALID_VALUE.matcher(value).matches()) {
			throw new IllegalArgumentException("Provider id must match [a-z][a-z0-9-]{2,62}");
		}
	}

	@Override
	public String toString() {
		return value;
	}
}
