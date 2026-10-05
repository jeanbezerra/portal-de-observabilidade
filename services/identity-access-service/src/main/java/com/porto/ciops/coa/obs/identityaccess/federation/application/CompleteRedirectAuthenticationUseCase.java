package com.porto.ciops.coa.obs.identityaccess.federation.application;

import java.lang.reflect.Array;
import java.time.Clock;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.IdentityNormalizer;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import io.micrometer.observation.annotation.Observed;
import org.springframework.stereotype.Service;

@Service
public class CompleteRedirectAuthenticationUseCase {

	private final IdentityProviderRegistry providers;
	private final IdentityNormalizer identityNormalizer;
	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;

	public CompleteRedirectAuthenticationUseCase(IdentityProviderRegistry providers,
			IdentityNormalizer identityNormalizer, AuditPublisher auditPublisher,
			TraceContext traceContext, Clock clock) {
		this.providers = providers;
		this.identityNormalizer = identityNormalizer;
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
	}

	@Observed(name = "identity.authenticate")
	public PlatformIdentity completeSaml(String providerId, String protocolSubject,
			Map<String, Object> attributes) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = providers.findById(id)
				.orElseThrow(() -> new ProviderNotFoundException(id));
		if (provider.status() != ProviderStatus.ENABLED || provider.type() != ProviderType.SAML) {
			throw new ProviderNotAvailableForLoginException();
		}

		Map<String, Object> mappedAttributes = new LinkedHashMap<>(attributes);
		if (firstText(protocolSubject) != null) {
			mappedAttributes.putIfAbsent("NameID", protocolSubject.trim());
		}
		String subjectAttribute = provider.attributeMappings().get("subject");
		String externalSubject = firstText(mappedAttributes.get(subjectAttribute));
		if (externalSubject == null) {
			throw new FederatedIdentityMappingException();
		}

		FederatedIdentity federated = new FederatedIdentity(externalSubject, provider.id(),
				ProviderType.SAML, mappedAttributes);
		PlatformIdentity identity = identityNormalizer.normalize(federated);
		auditPublisher.publish(AuditEvent.success(clock.instant(), "authentication.succeeded",
				identity.subject(), "browser-session", provider.id().value(), traceContext.currentTraceId()));
		return identity;
	}

	private static String firstText(Object value) {
		if (value instanceof Collection<?> collection) {
			return collection.isEmpty() ? null : normalizedText(collection.iterator().next());
		}
		if (value != null && value.getClass().isArray()) {
			return Array.getLength(value) == 0 ? null : normalizedText(Array.get(value, 0));
		}
		return normalizedText(value);
	}

	private static String normalizedText(Object value) {
		if (value == null || String.valueOf(value).isBlank()) {
			return null;
		}
		return String.valueOf(value).trim();
	}
}
