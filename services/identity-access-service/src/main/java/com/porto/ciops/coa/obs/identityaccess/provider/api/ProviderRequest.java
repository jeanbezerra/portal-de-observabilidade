package com.porto.ciops.coa.obs.identityaccess.provider.api;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderUpsertCommand;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Request used to create or update an identity provider. */
public record ProviderRequest(
		@NotBlank @Pattern(regexp = "[a-zA-Z][a-zA-Z0-9-]{2,62}") String id,
		@NotBlank @Size(max = 120) String displayName,
		@NotNull ProviderType type,
		@PositiveOrZero int priority,
		@NotNull Map<String, String> configuration,
		@NotNull Map<String, String> attributeMappings) {

	/**
	 * Creates an immutable request snapshot.
	 * @param id stable provider identifier
	 * @param displayName display name presented to administrators
	 * @param type federation protocol type
	 * @param priority discovery ordering priority
	 * @param configuration provider protocol settings
	 * @param attributeMappings mappings from platform to external attributes
	 */
	public ProviderRequest(String id, String displayName, ProviderType type, int priority,
			Map<String, String> configuration, Map<String, String> attributeMappings) {
		this.id = id;
		this.displayName = displayName;
		this.type = type;
		this.priority = priority;
		this.configuration = defensiveCopy(configuration);
		this.attributeMappings = defensiveCopy(attributeMappings);
	}

	/** Returns an immutable snapshot of the provider settings. */
	@Override
	public Map<String, String> configuration() {
		return defensiveCopy(configuration);
	}

	/** Returns an immutable snapshot of the attribute mappings. */
	@Override
	public Map<String, String> attributeMappings() {
		return defensiveCopy(attributeMappings);
	}

	/**
	 * Returns whether all configuration and mapping entries have nonblank keys and values.
	 * @return {@code true} when every key and value contains text
	 */
	@AssertTrue(message = "configuration and attribute mapping keys and values must not be blank")
	public boolean areMapsValid() {
		return hasOnlyTextEntries(configuration) && hasOnlyTextEntries(attributeMappings);
	}

	private static Map<String, String> defensiveCopy(Map<String, String> values) {
		return values == null ? null : Collections.unmodifiableMap(new LinkedHashMap<>(values));
	}

	private static boolean hasOnlyTextEntries(Map<String, String> values) {
		return values == null || values.entrySet().stream()
				.allMatch(entry -> hasText(entry.getKey()) && hasText(entry.getValue()));
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	ProviderUpsertCommand toCommand() {
		return new ProviderUpsertCommand(id, displayName, type, priority, configuration, attributeMappings);
	}
}
