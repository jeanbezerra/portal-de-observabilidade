package com.porto.ciops.coa.obs.identityaccess.federation.api;

import java.util.Arrays;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.federation.application.AuthenticateWithCredentialsUseCase;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.CredentialAuthenticationRequest;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.security.PlatformAuthenticationFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/login")
class CredentialAuthenticationController {

	private final AuthenticateWithCredentialsUseCase authenticateWithCredentials;
	private final SecurityContextRepository securityContextRepository;
	private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

	CredentialAuthenticationController(AuthenticateWithCredentialsUseCase authenticateWithCredentials,
			SecurityContextRepository securityContextRepository,
			SessionAuthenticationStrategy sessionAuthenticationStrategy) {
		this.authenticateWithCredentials = authenticateWithCredentials;
		this.securityContextRepository = securityContextRepository;
		this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
	}

	@PostMapping("/{providerId}")
	LoginResponse login(@PathVariable String providerId, @Valid @RequestBody CredentialLoginRequest request,
			HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
		char[] suppliedCredential = request.credential();
		try (CredentialAuthenticationRequest credentials = new CredentialAuthenticationRequest(
				request.username(), suppliedCredential)) {
			PlatformIdentity identity = authenticateWithCredentials.authenticate(providerId, credentials);
			UsernamePasswordAuthenticationToken authentication = PlatformAuthenticationFactory.authenticated(identity);
			sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);
			SecurityContext context = SecurityContextHolder.createEmptyContext();
			context.setAuthentication(authentication);
			SecurityContextHolder.setContext(context);
			securityContextRepository.saveContext(context, httpRequest, httpResponse);
			return LoginResponse.from(identity);
		}
		finally {
			Arrays.fill(suppliedCredential, '\0');
			request.eraseCredential();
		}
	}

	record CredentialLoginRequest(@NotBlank @Size(max = 255) String username,
			@NotNull @Size(min = 1, max = 1024) char[] credential) {
		CredentialLoginRequest {
			if (credential != null) {
				credential = credential.clone();
			}
		}

		@Override
		public char[] credential() {
			return credential == null ? null : credential.clone();
		}

		@Override
		public boolean equals(Object candidate) {
			if (this == candidate) {
				return true;
			}
			if (!(candidate instanceof CredentialLoginRequest(String otherUsername, char[] otherCredential))) {
				return false;
			}
			return java.util.Objects.equals(username, otherUsername)
					&& Arrays.equals(credential, otherCredential);
		}

		@Override
		public int hashCode() {
			return 31 * java.util.Objects.hashCode(username) + Arrays.hashCode(credential);
		}

		void eraseCredential() {
			if (credential != null) {
				Arrays.fill(credential, '\0');
			}
		}

		@Override
		public String toString() {
			return "CredentialLoginRequest[username=%s, credential=[REDACTED]]".formatted(username);
		}
	}

	record LoginResponse(String subject, String username, String email, String displayName,
			String providerId, Set<String> roles, Set<String> permissions) {
		static LoginResponse from(PlatformIdentity identity) {
			return new LoginResponse(identity.subject(), identity.username(), identity.email(), identity.displayName(),
					identity.providerId(), identity.roles(), identity.permissions());
		}
	}
}
