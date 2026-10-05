package com.porto.ciops.coa.obs.identityaccess.federation.application;

import java.time.Clock;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationResult;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationGateway;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationRequest;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
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
public class AuthenticateWithCredentialsUseCase {

	private final IdentityProviderRegistry providers;
	private final CredentialAuthenticationGateway authenticationGateway;
	private final IdentityNormalizer identityNormalizer;
	private final AuditPublisher auditPublisher;
	private final TraceContext traceContext;
	private final Clock clock;

	public AuthenticateWithCredentialsUseCase(IdentityProviderRegistry providers,
			CredentialAuthenticationGateway authenticationGateway, IdentityNormalizer identityNormalizer,
			AuditPublisher auditPublisher, TraceContext traceContext, Clock clock) {
		this.providers = providers;
		this.authenticationGateway = authenticationGateway;
		this.identityNormalizer = identityNormalizer;
		this.auditPublisher = auditPublisher;
		this.traceContext = traceContext;
		this.clock = clock;
	}

	@Observed(name = "identity.authenticate")
	public PlatformIdentity authenticate(String providerId, CredentialAuthenticationRequest request) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = providers.findById(id)
				.orElseThrow(() -> new ProviderNotFoundException(id));
		if (provider.status() != ProviderStatus.ENABLED || provider.type() != ProviderType.LDAP) {
			throw new ProviderNotAvailableForLoginException();
		}

		try {
			AuthenticationResult result = authenticationGateway.authenticate(provider, request);
			if (!result.authenticated()) {
				publishFailure(provider, request.username(), "invalid-credentials");
				throw new AuthenticationFailedException();
			}
			PlatformIdentity identity = identityNormalizer.normalize(result.identity());
			auditPublisher.publish(AuditEvent.success(clock.instant(), "authentication.succeeded",
					identity.subject(), "browser-session", provider.id().value(), traceContext.currentTraceId()));
			return identity;
		}
		catch (ProviderAuthenticationUnavailableException exception) {
			publishFailure(provider, request.username(), "provider-unavailable");
			throw exception;
		}
	}

	private void publishFailure(IdentityProviderDefinition provider, String username, String reason) {
		auditPublisher.publish(AuditEvent.failure(clock.instant(), "authentication.failed",
				"login:" + username, "browser-session", provider.id().value(),
				traceContext.currentTraceId(), reason));
	}
}
