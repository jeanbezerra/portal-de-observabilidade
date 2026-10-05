package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.net.URI;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.RedirectAuthenticationGateway;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
class SpringSamlRedirectAuthenticationGateway implements RedirectAuthenticationGateway {

	private final RelyingPartyRegistrationRepository registrations;

	SpringSamlRedirectAuthenticationGateway(RelyingPartyRegistrationRepository registrations) {
		this.registrations = registrations;
	}

	@Override
	public AuthenticationRedirect begin(IdentityProviderDefinition provider) {
		String registrationId = provider.configuration().get("registration-id");
		if (registrations.findByRegistrationId(registrationId) == null) {
			throw new ProviderAuthenticationUnavailableException(provider.id(),
					new IllegalStateException("SAML registration is unavailable"));
		}
		URI location = UriComponentsBuilder.fromPath("/saml2/authenticate/{registrationId}")
				.buildAndExpand(registrationId).encode().toUri();
		return new AuthenticationRedirect(location, Map.of());
	}
}
