package com.porto.ciops.coa.obs.identityaccess.federation.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.federation.application.BeginRedirectAuthenticationUseCase;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import org.junit.jupiter.api.Test;

class RedirectAuthenticationControllerTest {

	@Test
	void returnsAFoundResponseForTheSelectedProvider() {
		BeginRedirectAuthenticationUseCase useCase = mock(BeginRedirectAuthenticationUseCase.class);
		when(useCase.beginSaml("corporate-entra")).thenReturn(
				new AuthenticationRedirect(URI.create("/saml2/authenticate/corporate-entra"), Map.of()));

		var response = new RedirectAuthenticationController(useCase).begin("corporate-entra");

		assertThat(response.getStatusCode().value()).isEqualTo(302);
		assertThat(response.getHeaders().getLocation()).hasToString("/saml2/authenticate/corporate-entra");
	}
}
