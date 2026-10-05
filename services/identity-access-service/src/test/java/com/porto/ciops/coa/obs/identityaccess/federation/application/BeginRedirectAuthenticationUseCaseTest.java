package com.porto.ciops.coa.obs.identityaccess.federation.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class BeginRedirectAuthenticationUseCaseTest {

	@Test
	void delegatesAnEnabledSamlProviderToTheRedirectAdapter() {
		IdentityProviderDefinition provider = provider(ProviderType.SAML, true);
		BeginRedirectAuthenticationUseCase useCase = new BeginRedirectAuthenticationUseCase(registry(provider),
				selected -> new AuthenticationRedirect(URI.create("/saml2/authenticate/" + selected.id()), Map.of()));

		AuthenticationRedirect result = useCase.beginSaml(provider.id().value());

		assertThat(result.location()).hasToString("/saml2/authenticate/corporate-entra");
	}

	@Test
	void rejectsAProviderThatIsNotAnEnabledSamlProvider() {
		IdentityProviderDefinition provider = provider(ProviderType.OIDC, true);
		BeginRedirectAuthenticationUseCase useCase = new BeginRedirectAuthenticationUseCase(registry(provider),
				selected -> {
					throw new AssertionError("adapter must not run");
				});
		String providerId = provider.id().value();

		assertThatThrownBy(() -> useCase.beginSaml(providerId))
				.isInstanceOf(ProviderNotAvailableForLoginException.class);
	}

	private static IdentityProviderDefinition provider(ProviderType type, boolean enabled) {
		IdentityProviderDefinition provider = IdentityProviderDefinition.draft(new ProviderId("corporate-entra"),
				"Microsoft Entra ID", type, 0, Map.of(), Map.of(), Instant.EPOCH);
		if (enabled) {
			provider.markValidated(Instant.EPOCH.plusSeconds(1));
			provider.enable(Instant.EPOCH.plusSeconds(2));
		}
		return provider;
	}

	private static IdentityProviderRegistry registry(IdentityProviderDefinition provider) {
		return new IdentityProviderRegistry() {
			@Override
			public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
				return provider.id().equals(providerId) ? Optional.of(provider) : Optional.empty();
			}

			@Override
			public List<IdentityProviderDefinition> findEnabled() {
				return List.of(provider);
			}

			@Override
			public List<IdentityProviderDefinition> findByType(ProviderType type) {
				return provider.type() == type ? List.of(provider) : List.of();
			}
		};
	}
}
