package com.porto.ciops.coa.obs.identityaccess.provider.api;

import java.net.URI;
import java.security.Principal;
import java.util.List;

import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderQueryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/providers")
class ProviderAdministrationController {

	private final ProviderAdministrationService administrationService;
	private final ProviderQueryService queryService;

	ProviderAdministrationController(ProviderAdministrationService administrationService,
			ProviderQueryService queryService) {
		this.administrationService = administrationService;
		this.queryService = queryService;
	}

	@GetMapping
	@PreAuthorize("hasAuthority('identity-provider:read')")
	List<ProviderResponse> findAll() {
		return queryService.findAll().stream().map(ProviderResponse::from).toList();
	}

	@GetMapping("/{providerId}")
	@PreAuthorize("hasAuthority('identity-provider:read')")
	ProviderResponse findById(@PathVariable String providerId) {
		return ProviderResponse.from(queryService.findById(providerId));
	}

	@PostMapping
	@PreAuthorize("hasAuthority('identity-provider:create')")
	ResponseEntity<ProviderResponse> create(@Valid @RequestBody ProviderRequest request, Principal principal) {
		ProviderResponse response = ProviderResponse.from(
				administrationService.create(request.toCommand(), principal.getName()));
		return ResponseEntity.created(URI.create("/api/v1/providers/" + response.id())).body(response);
	}

	@PutMapping("/{providerId}")
	@PreAuthorize("hasAuthority('identity-provider:update')")
	ProviderResponse update(@PathVariable String providerId, @Valid @RequestBody ProviderRequest request,
			Principal principal) {
		return ProviderResponse.from(administrationService.update(providerId, request.toCommand(),
				principal.getName()));
	}

	@PostMapping("/{providerId}/validate")
	@PreAuthorize("hasAuthority('identity-provider:update')")
	ProviderResponse validate(@PathVariable String providerId, Principal principal) {
		return ProviderResponse.from(administrationService.validate(providerId, principal.getName()));
	}

	@PostMapping("/{providerId}/enable")
	@PreAuthorize("hasAuthority('identity-provider:enable')")
	ProviderResponse enable(@PathVariable String providerId, Principal principal) {
		return ProviderResponse.from(administrationService.enable(providerId, principal.getName()));
	}

	@PostMapping("/{providerId}/disable")
	@PreAuthorize("hasAuthority('identity-provider:disable')")
	ProviderResponse disable(@PathVariable String providerId, Principal principal) {
		return ProviderResponse.from(administrationService.disable(providerId, principal.getName()));
	}
}
