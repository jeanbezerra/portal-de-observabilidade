package com.porto.ciops.coa.obs.identityaccess.support.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import com.porto.ciops.coa.obs.identityaccess.federation.application.AuthenticationFailedException;
import com.porto.ciops.coa.obs.identityaccess.federation.application.ProviderNotAvailableForLoginException;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
import com.porto.ciops.coa.obs.identityaccess.provider.application.InvalidProviderConfigurationException;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderAlreadyExistsException;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.InvalidProviderTransitionException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.ProblemDetail;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

class ApiExceptionHandlerTest {

	private final ApiExceptionHandler handler = new ApiExceptionHandler(() -> "trace-123");
	private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/providers/test");

	@Test
	void mapsProviderAdministrationFailures() {
		ProviderId providerId = new ProviderId("corporate-oidc");

		assertProblem(handler.notFound(new ProviderNotFoundException(providerId), request), 404,
				"provider-not-found");
		assertProblem(handler.conflict(new ProviderAlreadyExistsException(providerId), request), 409,
				"provider-already-exists");
		assertProblem(handler.invalidTransition(new InvalidProviderTransitionException(providerId,
				ProviderStatus.DRAFT, "enable"), request), 409, "invalid-provider-transition");
		ProblemDetail invalidConfiguration = handler.invalidConfiguration(
				new InvalidProviderConfigurationException(List.of("configuration.issuer is required")), request);
		assertProblem(invalidConfiguration, 422, "invalid-provider-configuration");
		assertThat(invalidConfiguration.getProperties()).containsEntry("violations",
				List.of("configuration.issuer is required"));
	}

	@Test
	void mapsRequestValidationFailures() {
		BeanPropertyBindingResult binding = new BeanPropertyBindingResult(new Object(), "providerRequest");
		binding.addError(new FieldError("providerRequest", "displayName", "must not be blank"));
		MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
		when(exception.getBindingResult()).thenReturn(binding);

		ProblemDetail invalid = handler.invalidRequest(exception, request);
		ProblemDetail badRequest = handler.badRequest(new IllegalArgumentException("invalid id"), request);

		assertProblem(invalid, 400, "invalid-request");
		assertThat(invalid.getProperties()).containsEntry("violations",
				List.of("displayName: must not be blank"));
		assertProblem(badRequest, 400, "invalid-request");
	}

	@Test
	void mapsDependencyAndAuthenticationFailuresWithoutLeakingCauses() {
		ProviderId providerId = new ProviderId("corporate-oidc");

		assertProblem(handler.dependencyUnavailable(new DataAccessResourceFailureException("password=secret"),
				request), 503, "identity-store-unavailable");
		assertProblem(handler.authenticationFailed(new AuthenticationFailedException(), request), 401,
				"authentication-failed");
		assertProblem(handler.providerNotAvailable(new ProviderNotAvailableForLoginException(), request), 409,
				"provider-not-available");
		assertProblem(handler.providerUnavailable(new ProviderAuthenticationUnavailableException(providerId,
				new IllegalStateException("bind password secret")), request), 503,
				"identity-provider-unavailable");
	}

	private static void assertProblem(ProblemDetail problem, int status, String code) {
		assertThat(problem.getStatus()).isEqualTo(status);
		assertThat(problem.getType().toString()).endsWith("/" + code);
		assertThat(problem.getInstance()).hasToString("/api/v1/providers/test");
		assertThat(problem.getProperties()).containsEntry("code", code).containsEntry("traceId", "trace-123");
		assertThat(problem.getDetail()).doesNotContain("secret");
	}
}
