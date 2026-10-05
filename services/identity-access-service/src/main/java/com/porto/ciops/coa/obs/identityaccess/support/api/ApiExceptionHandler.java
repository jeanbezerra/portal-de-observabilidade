package com.porto.ciops.coa.obs.identityaccess.support.api;

import java.net.URI;
import java.util.List;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.provider.application.InvalidProviderConfigurationException;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderAlreadyExistsException;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.InvalidProviderTransitionException;
import com.porto.ciops.coa.obs.identityaccess.federation.application.AuthenticationFailedException;
import com.porto.ciops.coa.obs.identityaccess.federation.application.ProviderNotAvailableForLoginException;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.ProviderAuthenticationUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.dao.DataAccessException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
class ApiExceptionHandler {

	private final TraceContext traceContext;

	ApiExceptionHandler(TraceContext traceContext) {
		this.traceContext = traceContext;
	}

	@ExceptionHandler(ProviderNotFoundException.class)
	ProblemDetail notFound(ProviderNotFoundException exception, HttpServletRequest request) {
		return problem(HttpStatus.NOT_FOUND, "Identity provider not found", exception.getMessage(),
				"provider-not-found", request);
	}

	@ExceptionHandler(ProviderAlreadyExistsException.class)
	ProblemDetail conflict(ProviderAlreadyExistsException exception, HttpServletRequest request) {
		return problem(HttpStatus.CONFLICT, "Identity provider already exists", exception.getMessage(),
				"provider-already-exists", request);
	}

	@ExceptionHandler(InvalidProviderTransitionException.class)
	ProblemDetail invalidTransition(InvalidProviderTransitionException exception, HttpServletRequest request) {
		return problem(HttpStatus.CONFLICT, "Invalid provider lifecycle transition", exception.getMessage(),
				"invalid-provider-transition", request);
	}

	@ExceptionHandler(InvalidProviderConfigurationException.class)
	ProblemDetail invalidConfiguration(InvalidProviderConfigurationException exception,
			HttpServletRequest request) {
		ProblemDetail detail = problem(HttpStatus.UNPROCESSABLE_CONTENT, "Invalid provider configuration",
				exception.getMessage(), "invalid-provider-configuration", request);
		detail.setProperty("violations", exception.violations());
		return detail;
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail invalidRequest(MethodArgumentNotValidException exception, HttpServletRequest request) {
		List<String> violations = exception.getBindingResult().getFieldErrors().stream()
				.map(error -> error.getField() + ": " + error.getDefaultMessage()).toList();
		ProblemDetail detail = problem(HttpStatus.BAD_REQUEST, "Invalid request",
				"One or more request fields are invalid", "invalid-request", request);
		detail.setProperty("violations", violations);
		return detail;
	}

	@ExceptionHandler({IllegalArgumentException.class, ConstraintViolationException.class})
	ProblemDetail badRequest(RuntimeException exception, HttpServletRequest request) {
		return problem(HttpStatus.BAD_REQUEST, "Invalid request", exception.getMessage(),
				"invalid-request", request);
	}

	@ExceptionHandler(DataAccessException.class)
	ProblemDetail dependencyUnavailable(DataAccessException exception, HttpServletRequest request) {
		return problem(HttpStatus.SERVICE_UNAVAILABLE, "Identity store unavailable",
				"The identity service cannot access a required data store", "identity-store-unavailable", request);
	}

	@ExceptionHandler(AuthenticationFailedException.class)
	ProblemDetail authenticationFailed(AuthenticationFailedException exception, HttpServletRequest request) {
		return problem(HttpStatus.UNAUTHORIZED, "Authentication failed",
				"The supplied credentials could not be authenticated", "authentication-failed", request);
	}

	@ExceptionHandler(ProviderNotAvailableForLoginException.class)
	ProblemDetail providerNotAvailable(ProviderNotAvailableForLoginException exception,
			HttpServletRequest request) {
		return problem(HttpStatus.CONFLICT, "Identity provider is not enabled",
				exception.getMessage(), "provider-not-available", request);
	}

	@ExceptionHandler(ProviderAuthenticationUnavailableException.class)
	ProblemDetail providerUnavailable(ProviderAuthenticationUnavailableException exception,
			HttpServletRequest request) {
		return problem(HttpStatus.SERVICE_UNAVAILABLE, "Identity provider unavailable",
				"The selected identity provider is temporarily unavailable", "identity-provider-unavailable", request);
	}

	private ProblemDetail problem(HttpStatusCode status, String title, String detail, String code,
			HttpServletRequest request) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
		problem.setTitle(title);
		problem.setType(URI.create("https://docs.obs.local/problems/" + code));
		problem.setInstance(URI.create(request.getRequestURI()));
		problem.setProperty("code", code);
		problem.setProperty("traceId", traceContext.currentTraceId());
		return problem;
	}
}
