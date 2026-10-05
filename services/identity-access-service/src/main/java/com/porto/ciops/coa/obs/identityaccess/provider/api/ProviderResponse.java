package com.porto.ciops.coa.obs.identityaccess.provider.api;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderInteraction;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;

/** Public, secret-safe representation of an identity provider. */
public record ProviderResponse(String id, String displayName, ProviderType type,
		ProviderInteraction interaction, ProviderStatus status, int priority,
		Map<String, String> configuration, Map<String, String> attributeMappings,
		Instant createdAt, Instant updatedAt, long version) {

	private static final Set<String> SENSITIVE_KEY_PARTS = Set.of(
			"secret", "password", "credential", "private-key", "api-key", "token");

	/**
	 * Creates an immutable, secret-safe response snapshot.
	 * @param id stable provider identifier
	 * @param displayName administrator-facing provider name
	 * @param type federation protocol type
	 * @param interaction authentication interaction type
	 * @param status provider lifecycle status
	 * @param priority discovery ordering priority
	 * @param configuration redacted provider settings
	 * @param attributeMappings platform attribute mappings
	 * @param createdAt creation timestamp
	 * @param updatedAt last update timestamp
	 * @param version optimistic locking version
	 */
	public ProviderResponse(String id, String displayName, ProviderType type,
			ProviderInteraction interaction, ProviderStatus status, int priority,
			Map<String, String> configuration, Map<String, String> attributeMappings,
			Instant createdAt, Instant updatedAt, long version) {
		this.id = id;
		this.displayName = displayName;
		this.type = type;
		this.interaction = interaction;
		this.status = status;
		this.priority = priority;
		this.configuration = Map.copyOf(configuration);
		this.attributeMappings = Map.copyOf(attributeMappings);
		this.createdAt = createdAt;
		this.updatedAt = updatedAt;
		this.version = version;
	}

	static ProviderResponse from(IdentityProviderDefinition provider) {
		return new ProviderResponse(provider.id().value(), provider.displayName(), provider.type(),
				provider.interaction(), provider.status(), provider.priority(), redact(provider.configuration()),
				provider.attributeMappings(), provider.createdAt(), provider.updatedAt(), provider.version());
	}

	private static Map<String, String> redact(Map<String, String> configuration) {
		return configuration.entrySet().stream().collect(Collectors.toUnmodifiableMap(Map.Entry::getKey,
				entry -> isSensitive(entry.getKey()) ? "[REDACTED]" : entry.getValue()));
	}

	private static boolean isSensitive(String key) {
		String normalized = key.toLowerCase(Locale.ROOT);
		return normalized.endsWith("-reference")
				|| SENSITIVE_KEY_PARTS.stream().anyMatch(normalized::contains);
	}
}
