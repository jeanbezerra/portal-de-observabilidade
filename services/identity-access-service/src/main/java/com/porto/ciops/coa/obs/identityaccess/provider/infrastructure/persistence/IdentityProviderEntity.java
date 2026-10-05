package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure.persistence;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderInteraction;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "identity_provider")
class IdentityProviderEntity {

	@Id
	private UUID id;

	@Column(name = "provider_key", nullable = false, unique = true, length = 63)
	private String providerKey;

	@Column(name = "display_name", nullable = false, length = 120)
	private String displayName;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private ProviderType type;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private ProviderInteraction interaction;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 16)
	private ProviderStatus status;

	@Column(nullable = false)
	private int priority;

	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "identity_provider_setting", joinColumns = @JoinColumn(name = "provider_id"))
	@MapKeyColumn(name = "setting_key", length = 100)
	@Column(name = "setting_value", nullable = false, length = 2048)
	private Map<String, String> configuration = new HashMap<>();

	@ElementCollection(fetch = FetchType.LAZY)
	@CollectionTable(name = "provider_attribute_mapping", joinColumns = @JoinColumn(name = "provider_id"))
	@MapKeyColumn(name = "platform_attribute", length = 100)
	@Column(name = "external_attribute", nullable = false)
	private Map<String, String> attributeMappings = new HashMap<>();

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	@Version
	@Column(nullable = false)
	private Long version;

	protected IdentityProviderEntity() {
		// Required by JPA.
	}

	static IdentityProviderEntity create(IdentityProviderDefinition provider) {
		IdentityProviderEntity entity = new IdentityProviderEntity();
		entity.id = UUID.randomUUID();
		entity.copyFrom(provider);
		return entity;
	}

	void copyFrom(IdentityProviderDefinition provider) {
		providerKey = provider.id().value();
		displayName = provider.displayName();
		type = provider.type();
		interaction = provider.interaction();
		status = provider.status();
		priority = provider.priority();
		configuration.clear();
		configuration.putAll(provider.configuration());
		attributeMappings.clear();
		attributeMappings.putAll(provider.attributeMappings());
		createdAt = provider.createdAt();
		updatedAt = provider.updatedAt();
	}

	IdentityProviderDefinition toDomain() {
		return IdentityProviderDefinition.reconstitute(new ProviderId(providerKey), displayName, type,
				interaction, status, priority, configuration, attributeMappings, createdAt, updatedAt,
				version == null ? 0 : version);
	}
}
