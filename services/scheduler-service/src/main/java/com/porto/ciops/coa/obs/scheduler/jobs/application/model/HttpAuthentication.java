package com.porto.ciops.coa.obs.scheduler.jobs.application.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record HttpAuthentication(
		@NotBlank @Pattern(regexp = "NONE|BASIC|BEARER|API_KEY|OAUTH2_CLIENT_CREDENTIALS") String type,
		@Size(max = 500) String username,
		@Size(max = 300) String passwordSecretRef,
		@Size(max = 300) String tokenSecretRef,
		@Size(max = 200) String apiKeyName,
		@Pattern(regexp = "HEADER|QUERY") String apiKeyLocation,
		@Size(max = 8192) String tokenUrl,
		@Size(max = 500) String clientId,
		@Size(max = 300) String clientSecretRef,
		@NotNull @Size(max = 50) List<String> scopes,
		@Size(max = 1000) String audience,
		@Pattern(regexp = "BASIC|REQUEST_BODY") String clientAuthenticationMethod,
		@NotNull @Valid @Size(max = 100) List<HttpRequestParameter> tokenParameters) {

	public HttpAuthentication {
		if (scopes != null) {
			scopes = List.copyOf(scopes);
		}
		if (tokenParameters != null) {
			tokenParameters = List.copyOf(tokenParameters);
		}
	}
}
