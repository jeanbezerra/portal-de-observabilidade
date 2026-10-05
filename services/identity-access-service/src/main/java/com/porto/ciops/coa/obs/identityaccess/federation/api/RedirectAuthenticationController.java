package com.porto.ciops.coa.obs.identityaccess.federation.api;

import com.porto.ciops.coa.obs.identityaccess.federation.application.BeginRedirectAuthenticationUseCase;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.AuthenticationRedirect;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/login")
class RedirectAuthenticationController {

	private final BeginRedirectAuthenticationUseCase beginRedirectAuthentication;

	RedirectAuthenticationController(BeginRedirectAuthenticationUseCase beginRedirectAuthentication) {
		this.beginRedirectAuthentication = beginRedirectAuthentication;
	}

	@GetMapping("/{providerId}")
	ResponseEntity<Void> begin(@PathVariable String providerId) {
		AuthenticationRedirect redirect = beginRedirectAuthentication.beginSaml(providerId);
		return ResponseEntity.status(HttpStatus.FOUND)
				.header(HttpHeaders.LOCATION, redirect.location().toASCIIString())
				.build();
	}
}
