package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.saml2.provider.service.registration.IterableRelyingPartyRegistrationRepository;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistration;
import org.springframework.stereotype.Repository;

@Repository
class DynamicSamlRelyingPartyRegistrationRepository
		implements IterableRelyingPartyRegistrationRepository {

	private static final Logger LOGGER = LoggerFactory.getLogger(DynamicSamlRelyingPartyRegistrationRepository.class);
	private static final Duration DEFAULT_METADATA_CACHE_TTL = Duration.ofHours(1);
	private static final Duration METADATA_REFRESH_RETRY = Duration.ofMinutes(1);
	private final IdentityProviderRegistry providers;
	private final SamlProviderRegistrationFactory registrationFactory;
	private final Clock clock;
	private final Map<String, CacheEntry> registrations;
	private final Lock refreshLock;

	@Autowired
	DynamicSamlRelyingPartyRegistrationRepository(IdentityProviderRegistry providers,
			SamlProviderRegistrationFactory registrationFactory, Clock clock) {
		this.providers = providers;
		this.registrationFactory = registrationFactory;
		this.clock = clock;
		this.registrations = new ConcurrentHashMap<>();
		this.refreshLock = new ReentrantLock();
	}

	@Override
	public RelyingPartyRegistration findByRegistrationId(String registrationId) {
		IdentityProviderDefinition provider = findProvider(registrationId);
		if (provider == null || provider.type() != ProviderType.SAML
				|| provider.status() != ProviderStatus.ENABLED) {
			registrations.remove(registrationId);
			return null;
		}
		CacheEntry cached = registrations.get(registrationId);
		Instant now = clock.instant();
		if (matches(cached, provider) && now.isBefore(cached.refreshAfter())) {
			return cached.registration();
		}
		return refresh(provider, now);
	}

	private IdentityProviderDefinition findProvider(String registrationId) {
		try {
			return providers.findById(new ProviderId(registrationId)).orElse(null);
		}
		catch (IllegalArgumentException _) {
			return null;
		}
	}

	private RelyingPartyRegistration refresh(IdentityProviderDefinition provider, Instant now) {
		refreshLock.lock();
		try {
			return refreshWhileLocked(provider, now);
		}
		finally {
			refreshLock.unlock();
		}
	}

	private RelyingPartyRegistration refreshWhileLocked(IdentityProviderDefinition provider, Instant now) {
		String registrationId = provider.id().value();
		CacheEntry current = registrations.get(registrationId);
		if (matches(current, provider) && now.isBefore(current.refreshAfter())) {
			return current.registration();
		}
		try {
			RelyingPartyRegistration registration = registrationFactory.create(provider);
			registrations.put(registrationId, new CacheEntry(provider.version(), provider.updatedAt(),
					now.plus(metadataCacheTtl(provider)), registration));
			return registration;
		}
		catch (RuntimeException exception) {
			return recoverFromRefreshFailure(provider, now, current, exception);
		}
	}

	private RelyingPartyRegistration recoverFromRefreshFailure(IdentityProviderDefinition provider, Instant now,
			CacheEntry current, RuntimeException exception) {
		String registrationId = provider.id().value();
		if (matches(current, provider)) {
			registrations.put(registrationId, new CacheEntry(current.version(), current.updatedAt(),
					now.plus(METADATA_REFRESH_RETRY), current.registration()));
			if (LOGGER.isWarnEnabled()) {
				LOGGER.warn("Unable to refresh SAML metadata for provider {}; using the last valid registration",
						registrationId, exception);
			}
			return current.registration();
		}
		registrations.remove(registrationId);
		if (LOGGER.isWarnEnabled()) {
			LOGGER.warn("Unable to load SAML registration for provider {}", registrationId, exception);
		}
		return null;
	}

	@Override
	public Iterator<RelyingPartyRegistration> iterator() {
		return providers.findByType(ProviderType.SAML).stream()
				.filter(provider -> provider.status() == ProviderStatus.ENABLED)
				.map(provider -> findByRegistrationId(provider.id().value()))
				.filter(java.util.Objects::nonNull)
				.iterator();
	}

	private static boolean matches(CacheEntry cached, IdentityProviderDefinition provider) {
		return cached != null && cached.version() == provider.version()
				&& cached.updatedAt().equals(provider.updatedAt());
	}

	private static Duration metadataCacheTtl(IdentityProviderDefinition provider) {
		String configured = provider.configuration().get("metadata-cache-ttl-ms");
		if (configured == null) {
			return DEFAULT_METADATA_CACHE_TTL;
		}
		try {
			return Duration.ofMillis(Long.parseLong(configured));
		}
		catch (NumberFormatException _) {
			return DEFAULT_METADATA_CACHE_TTL;
		}
	}

	private record CacheEntry(long version, Instant updatedAt, Instant refreshAfter,
			RelyingPartyRegistration registration) {
	}
}
