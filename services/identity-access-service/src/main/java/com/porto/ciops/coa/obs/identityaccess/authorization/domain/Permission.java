package com.porto.ciops.coa.obs.identityaccess.authorization.domain;

import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

public record Permission(String resource, String action) {

	private static final Pattern PART = Pattern.compile("[a-z][a-z0-9-]{1,62}");
	private static final int PERMISSION_PART_COUNT = 2;

	public Permission {
		resource = normalize(resource, "resource");
		action = normalize(action, "action");
	}

	public static Permission parse(String value) {
		Objects.requireNonNull(value, "value");
		String[] parts = value.split(":", -1);
		if (parts.length != PERMISSION_PART_COUNT) {
			throw new IllegalArgumentException("Permission must follow <resource>:<action>");
		}
		return new Permission(parts[0], parts[1]);
	}

	public String value() {
		return resource + ":" + action;
	}

	private static String normalize(String value, String field) {
		String normalized = Objects.requireNonNull(value, field).trim().toLowerCase(Locale.ROOT);
		if (!PART.matcher(normalized).matches()) {
			throw new IllegalArgumentException(field + " contains invalid characters");
		}
		return normalized;
	}
}
