package com.porto.ciops.coa.obs.identityaccess.federation.application;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.RedirectAuthenticationGateway;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import io.micrometer.observation.annotation.Observed;
import org.springframework.stereotype.Service;

@Service
public class BeginRedirectAuthenticationUseCase {

	private final IdentityProviderRegistry providers;
	private final RedirectAuthenticationGateway redirectGateway;

	public BeginRedirectAuthenticationUseCase(IdentityProviderRegistry providers,
			RedirectAuthenticationGateway redirectGateway) {
		this.providers = providers;
		this.redirectGateway = redirectGateway;
	}

	@Observed(name = "identity.saml.authenticate")
	public AuthenticationRedirect beginSaml(String providerId) {
		ProviderId id = new ProviderId(providerId);
		IdentityProviderDefinition provider = providers.findById(id)
				.orElseThrow(() -> new ProviderNotFoundException(id));
		if (provider.status() != ProviderStatus.ENABLED || provider.type() != ProviderType.SAML) {
			throw new ProviderNotAvailableForLoginException();
		}
		return redirectGateway.begin(provider);
	}
}
