package com.porto.ciops.coa.obs.identityaccess.provider.domain;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

public final class IdentityProviderDefinition implements IdentityProvider {

	private final ProviderId id;
	private final String displayName;
	private final ProviderType type;
	private final ProviderInteraction interaction;
	private final int priority;
	private final Map<String, String> configuration;
	private final Map<String, String> attributeMappings;
	private final Instant createdAt;
	private final long version;
	private ProviderStatus status;
	private Instant updatedAt;

	private IdentityProviderDefinition(ProviderId id, String displayName, ProviderType type,
			ProviderInteraction interaction, ProviderStatus status, int priority,
			Map<String, String> configuration, Map<String, String> attributeMappings,
			Instant createdAt, Instant updatedAt, long version) {
		this.id = Objects.requireNonNull(id, "id");
		this.displayName = requireText(displayName, "displayName");
		this.type = Objects.requireNonNull(type, "type");
		this.interaction = Objects.requireNonNull(interaction, "interaction");
		this.status = Objects.requireNonNull(status, "status");
		if (priority < 0) {
			throw new IllegalArgumentException("priority must be greater than or equal to zero");
		}
		this.priority = priority;
		this.configuration = Map.copyOf(configuration);
		this.attributeMappings = Map.copyOf(attributeMappings);
		this.createdAt = Objects.requireNonNull(createdAt, "createdAt");
		this.updatedAt = Objects.requireNonNull(updatedAt, "updatedAt");
		this.version = version;
	}

	public static IdentityProviderDefinition draft(ProviderId id, String displayName, ProviderType type,
			int priority, Map<String, String> configuration, Map<String, String> attributeMappings, Instant now) {
		return new IdentityProviderDefinition(id, displayName, type, ProviderInteraction.forType(type),
				ProviderStatus.DRAFT, priority, configuration, attributeMappings, now, now, 0);
	}

	public static IdentityProviderDefinition reconstitute(ProviderId id, String displayName, ProviderType type,
			ProviderInteraction interaction, ProviderStatus status, int priority,
			Map<String, String> configuration, Map<String, String> attributeMappings,
			Instant createdAt, Instant updatedAt, long version) {
		return new IdentityProviderDefinition(id, displayName, type, interaction, status, priority,
				configuration, attributeMappings, createdAt, updatedAt, version);
	}

	public IdentityProviderDefinition revise(String newDisplayName, int newPriority,
			Map<String, String> newConfiguration, Map<String, String> newAttributeMappings, Instant now) {
		if (status == ProviderStatus.ENABLED) {
			throw new InvalidProviderTransitionException(id, status, "revise");
		}
		return new IdentityProviderDefinition(id, newDisplayName, type, interaction, ProviderStatus.DRAFT,
				newPriority, newConfiguration, newAttributeMappings, createdAt, now, version);
	}

	public void markValidated(Instant now) {
		if (status != ProviderStatus.DRAFT && status != ProviderStatus.ERROR) {
			throw new InvalidProviderTransitionException(id, status, "validate");
		}
		status = ProviderStatus.VALIDATED;
		updatedAt = now;
	}

	public void enable(Instant now) {
		if (status != ProviderStatus.VALIDATED && status != ProviderStatus.DISABLED) {
			throw new InvalidProviderTransitionException(id, status, "enable");
		}
		status = ProviderStatus.ENABLED;
		updatedAt = now;
	}

	public void disable(Instant now) {
		if (status != ProviderStatus.ENABLED) {
			throw new InvalidProviderTransitionException(id, status, "disable");
		}
		status = ProviderStatus.DISABLED;
		updatedAt = now;
	}

	public void markError(Instant now) {
		status = ProviderStatus.ERROR;
		updatedAt = now;
	}

	@Override
	public ProviderId id() {
		return id;
	}

	public String displayName() {
		return displayName;
	}

	@Override
	public ProviderType type() {
		return type;
	}

	public ProviderInteraction interaction() {
		return interaction;
	}

	@Override
	public ProviderStatus status() {
		return status;
	}

	public int priority() {
		return priority;
	}

	public Map<String, String> configuration() {
		return immutableCopy(configuration);
	}

	public Map<String, String> attributeMappings() {
		return immutableCopy(attributeMappings);
	}

	public Instant createdAt() {
		return createdAt;
	}

	public Instant updatedAt() {
		return updatedAt;
	}

	public long version() {
		return version;
	}

	private static String requireText(String value, String field) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException(field + " must not be blank");
		}
		return value.trim();
	}

	private static Map<String, String> immutableCopy(Map<String, String> values) {
		return Collections.unmodifiableMap(new LinkedHashMap<>(values));
	}
}
