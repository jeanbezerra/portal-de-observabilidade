package com.porto.ciops.coa.scheduler.api.support;

import org.quartz.SchedulerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);

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
