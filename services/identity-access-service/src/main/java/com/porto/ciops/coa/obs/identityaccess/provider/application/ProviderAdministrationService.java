package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.time.Clock;
import java.time.Instant;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProviderAdministrationService {

	private static final String PROVIDER_DISCOVERY_CACHE = "provider-discovery";
	private final IdentityProviderRepository providers;
	private final ProviderConfigurationValidator validator;
	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;

	public ProviderAdministrationService(IdentityProviderRepository providers,
			ProviderConfigurationValidator validator, AuditPublisher auditPublisher,
			TraceContext traceContext, Clock clock) {
		this.providers = providers;
		this.validator = validator;
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
	}

	@CacheEvict(cacheNames = PROVIDER_DISCOVERY_CACHE, allEntries = true)
	public IdentityProviderDefinition create(ProviderUpsertCommand command, String actor) {
		ProviderId id = new ProviderId(command.id());
		if (providers.existsById(id)) {
			throw new ProviderAlreadyExistsException(id);
		}
		Instant now = clock.instant();
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(id, command.displayName(),
				command.type(), command.priority(), command.configuration(), command.attributeMappings(), now);
		validator.validateSecretSafety(provider);
		IdentityProviderDefinition saved = providers.save(provider);
		publish("identity-provider.created", actor, id);
		return saved;
	}

	@CacheEvict(cacheNames = PROVIDER_DISCOVERY_CACHE, allEntries = true)
	public IdentityProviderDefinition update(String providerId, ProviderUpsertCommand command, String actor) {
		ProviderId id = new ProviderId(providerId);
		if (!id.value().equals(new ProviderId(command.id()).value())) {
			throw new IllegalArgumentException("The provider id cannot be changed");
		}
		IdentityProviderDefinition current = requireProvider(id);
		if (current.type() != command.type()) {
			throw new IllegalArgumentException("The provider type cannot be changed");
		}
		IdentityProviderDefinition updated = current.revise(command.displayName(), command.priority(),
				command.configuration(), command.attributeMappings(), clock.instant());
		validator.validateSecretSafety(updated);
		IdentityProviderDefinition saved = providers.save(updated);
		publish("identity-provider.updated", actor, id);
		return saved;
	}

	@CacheEvict(cacheNames = PROVIDER_DISCOVERY_CACHE, allEntries = true)
	public IdentityProviderDefinition validate(String providerId, String actor) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = requireProvider(id);
		validator.validate(provider);
		provider.markValidated(clock.instant());
		IdentityProviderDefinition saved = providers.save(provider);
		publish("identity-provider.validated", actor, id);
		return saved;
	}

	@CacheEvict(cacheNames = PROVIDER_DISCOVERY_CACHE, allEntries = true)
	public IdentityProviderDefinition enable(String providerId, String actor) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = requireProvider(id);
		validator.validate(provider);
		provider.enable(clock.instant());
		IdentityProviderDefinition saved = providers.save(provider);
		publish("identity-provider.enabled", actor, id);
		return saved;
	}

	@CacheEvict(cacheNames = PROVIDER_DISCOVERY_CACHE, allEntries = true)
	public IdentityProviderDefinition disable(String providerId, String actor) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = requireProvider(id);
		provider.disable(clock.instant());
		IdentityProviderDefinition saved = providers.save(provider);
		publish("identity-provider.disabled", actor, id);
		return saved;
	}

	private IdentityProviderDefinition requireProvider(ProviderId id) {
		return providers.findById(id).orElseThrow(() -> new ProviderNotFoundException(id));
	}

	private void publish(String eventType, String actor, ProviderId id) {
		auditPublisher.publish(AuditEvent.success(clock.instant(), eventType, actor,
				"identity-provider/" + id.value(), id.value(), traceContext.currentTraceId()));
	}
}
