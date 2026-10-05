package com.porto.ciops.coa.obs.scheduler.support;

import org.quartz.SchedulerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

	@ExceptionHandler(ApplicationProblemException.class)
	ProblemDetail handleApplicationProblem(ApplicationProblemException exception) {
		HttpStatus status = switch (exception.getKind()) {
			case INVALID_INPUT -> HttpStatus.BAD_REQUEST;
			case RESOURCE_NOT_FOUND -> HttpStatus.NOT_FOUND;
			case STATE_CONFLICT -> HttpStatus.CONFLICT;
		};
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, exception.getMessage());
		problem.setTitle(exception.getTitle());
		return problem;
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail handleValidation(MethodArgumentNotValidException exception) {
		String detail = exception.getBindingResult().getFieldErrors().stream()
				.findFirst()
				.map(error -> error.getField() + ": " + error.getDefaultMessage())
				.orElse("Revise os dados enviados.");
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, detail);
		problem.setTitle("Dados inválidos");
		return problem;
	}

	@ExceptionHandler(SchedulerException.class)
	ProblemDetail handleSchedulerException(SchedulerException exception) {
		LOGGER.error("Falha ao acessar o Quartz Scheduler", exception);

		ProblemDetail problem = ProblemDetail.forStatusAndDetail(
				HttpStatus.SERVICE_UNAVAILABLE,
				"Não foi possível consultar ou administrar o scheduler neste momento.");
		problem.setTitle("Scheduler indisponível");
		return problem;
	}
}
