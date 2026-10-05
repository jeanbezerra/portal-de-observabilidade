package com.porto.ciops.coa.obs.identityaccess.provider.api;

import java.util.List;

import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderDiscoveryView;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderQueryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/providers")
class ProviderDiscoveryController {

	private final ProviderQueryService providerQueryService;

	ProviderDiscoveryController(ProviderQueryService providerQueryService) {
		this.providerQueryService = providerQueryService;
	}

	@GetMapping
	List<ProviderDiscoveryView> discover() {
		return providerQueryService.discoverEnabled();
	}
}
