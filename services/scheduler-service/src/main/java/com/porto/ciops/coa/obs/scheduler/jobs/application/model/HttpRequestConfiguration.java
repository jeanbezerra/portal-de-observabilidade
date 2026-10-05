package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record HttpRequestConfiguration(
		@NotBlank @Pattern(regexp = "GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS") String method,
		@NotBlank @Size(max = 8192) String url,
		@NotNull @Size(max = 500) List<@Valid HttpRequestParameter> queryParameters,
		@NotNull @Size(max = 200) List<@Valid HttpRequestParameter> headers,
		@NotNull @Size(max = 100) List<@Valid HttpRequestParameter> cookies,
		@NotNull @Valid HttpAuthentication authentication,
		@NotBlank @Pattern(regexp = "NONE|RAW|JSON|FORM_URLENCODED") String bodyType,
		@NotNull @Size(max = 2000000) String body,
		@NotNull @Size(max = 500) List<@Valid HttpRequestParameter> formParameters,
		@NotNull @Size(max = 200) String contentType,
		@Min(1) @Max(120) int connectTimeoutSeconds,
		@Min(1) @Max(3600) int requestTimeoutSeconds,
		Boolean ignoreTlsValidation,
		@NotBlank @Pattern(regexp = "NEVER|NORMAL") String redirectPolicy,
		@NotBlank @Pattern(regexp = "HTTP_1_1|HTTP_2") String httpVersion,
		@NotNull @Size(max = 100) List<@Min(100) @Max(599) Integer> expectedStatusCodes,
		@Min(1024) @Max(5000000) int maxResponseBytes,
		@NotNull @Valid HttpRetryPolicy retry) {

	public HttpRequestConfiguration {
		ignoreTlsValidation = Boolean.TRUE.equals(ignoreTlsValidation);
	}
}
