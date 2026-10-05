package com.porto.ciops.coa.obs.identityaccess.authorization.api;

import java.security.Principal;
import java.util.Map;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationDecision;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationRequest;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationService;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.Permission;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/authorization")
class AuthorizationController {

	private final AuthorizationService authorizationService;

	AuthorizationController(AuthorizationService authorizationService) {
		this.authorizationService = authorizationService;
	}

	@PostMapping("/evaluate")
	@PreAuthorize("isAuthenticated()")
	AuthorizationDecision evaluate(@Valid @RequestBody EvaluationRequest request, Principal principal) {
		return authorizationService.authorize(new AuthorizationRequest(principal.getName(), request.providerId(),
				Permission.parse(request.permission()), request.groups(), request.attributes()));
	}

	record EvaluationRequest(@NotBlank String providerId, @NotBlank String permission,
			@NotNull Set<String> groups, @NotNull Map<String, Object> attributes) {
		EvaluationRequest {
			groups = groups == null ? Set.of() : Set.copyOf(groups);
			attributes = attributes == null ? Map.of() : Map.copyOf(attributes);
		}
	}
}
