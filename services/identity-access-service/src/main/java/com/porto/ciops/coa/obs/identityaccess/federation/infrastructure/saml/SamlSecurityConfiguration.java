package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import com.porto.ciops.coa.obs.identityaccess.federation.application.CompleteRedirectAuthenticationUseCase;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.saml2.provider.service.authentication.OpenSaml5AuthenticationProvider;
import org.springframework.security.saml2.provider.service.registration.RelyingPartyRegistrationRepository;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration(proxyBeanMethods = false)
public class SamlSecurityConfiguration {

	private final RelyingPartyRegistrationRepository registrations;
	private final SamlResponseAuthenticationConverter responseConverter;
	private final SamlAuthenticationFailureHandler failureHandler;

	public SamlSecurityConfiguration(RelyingPartyRegistrationRepository registrations,
			SamlResponseAuthenticationConverter responseConverter,
			SamlAuthenticationFailureHandler failureHandler) {
		this.registrations = registrations;
		this.responseConverter = responseConverter;
		this.failureHandler = failureHandler;
	}

	@Bean
	static SamlResponseAuthenticationConverter samlResponseAuthenticationConverter(
			CompleteRedirectAuthenticationUseCase completeAuthentication) {
		return new SamlResponseAuthenticationConverter(completeAuthentication);
	}

	public void configure(HttpSecurity http, SecurityContextRepository securityContextRepository) {
		OpenSaml5AuthenticationProvider authenticationProvider = new OpenSaml5AuthenticationProvider();
		authenticationProvider.setResponseAuthenticationConverter(responseConverter);
		ProviderManager authenticationManager = new ProviderManager(authenticationProvider);
		http.saml2Login(saml -> saml
				.relyingPartyRegistrationRepository(registrations)
				.authenticationManager(authenticationManager)
				.securityContextRepository(securityContextRepository)
				.successHandler(new SimpleUrlAuthenticationSuccessHandler("/"))
				.failureHandler(failureHandler)
				.permitAll());
		http.saml2Metadata(Customizer.withDefaults());
	}
}
