package com.porto.ciops.coa.obs.identityaccess.provider.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.security.Principal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderQueryService;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderUpsertCommand;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class ProviderControllersTest {

	@Test
	void delegatesEveryAdministrativeOperation() {
		ProviderAdministrationService administration = mock(ProviderAdministrationService.class);
		ProviderQueryService queries = mock(ProviderQueryService.class);
		ProviderAdministrationController controller = new ProviderAdministrationController(administration, queries);
		IdentityProviderDefinition provider = provider();
		ProviderRequest request = request();
		ProviderUpsertCommand command = request.toCommand();
		Principal principal = () -> "admin-1";
		when(queries.findAll()).thenReturn(List.of(provider));
		when(queries.findById("corporate-oidc")).thenReturn(provider);
		when(administration.create(command, "admin-1")).thenReturn(provider);
		when(administration.update("corporate-oidc", command, "admin-1")).thenReturn(provider);
		when(administration.validate("corporate-oidc", "admin-1")).thenReturn(provider);
		when(administration.enable("corporate-oidc", "admin-1")).thenReturn(provider);
		when(administration.disable("corporate-oidc", "admin-1")).thenReturn(provider);

		assertThat(controller.findAll()).singleElement().extracting(ProviderResponse::id)
				.isEqualTo("corporate-oidc");
		assertThat(controller.findById("corporate-oidc").id()).isEqualTo("corporate-oidc");
		java.net.URI createdLocation = controller.create(request, principal).getHeaders().getLocation();
		assertThat(createdLocation).hasToString("/api/v1/providers/corporate-oidc");
		assertThat(controller.update("corporate-oidc", request, principal).id()).isEqualTo("corporate-oidc");
		assertThat(controller.validate("corporate-oidc", principal).id()).isEqualTo("corporate-oidc");
		assertThat(controller.enable("corporate-oidc", principal).id()).isEqualTo("corporate-oidc");
		assertThat(controller.disable("corporate-oidc", principal).id()).isEqualTo("corporate-oidc");
	}

	@Test
	void discoversEnabledProvidersAndCopiesMutableRequestMaps() {
		IdentityProviderDefinition provider = provider();
		IdentityProviderRepository repository = mock(IdentityProviderRepository.class);
		when(repository.findEnabled()).thenReturn(List.of(provider));
		when(repository.findAll()).thenReturn(List.of(provider));
		when(repository.findById(provider.id())).thenReturn(Optional.of(provider));
		ProviderQueryService queries = new ProviderQueryService(repository);
		ProviderDiscoveryController discovery = new ProviderDiscoveryController(queries);
		Map<String, String> configuration = new LinkedHashMap<>(Map.of("issuer-uri", "https://login.example"));
		Map<String, String> mappings = new LinkedHashMap<>(Map.of("subject", "sub"));
		ProviderRequest request = new ProviderRequest("corporate-oidc", "Corporate OIDC", ProviderType.OIDC, 0,
				configuration, mappings);
		configuration.clear();
		mappings.clear();

		assertThat(request.configuration()).containsEntry("issuer-uri", "https://login.example");
		assertThat(request.attributeMappings()).containsEntry("subject", "sub");
		assertThat(request.areMapsValid()).isTrue();
		Map<String, String> invalid = new LinkedHashMap<>();
		invalid.put("subject", " ");
		assertThat(new ProviderRequest("corporate-oidc", "Corporate OIDC", ProviderType.OIDC, 0,
				invalid, Map.of()).areMapsValid()).isFalse();
		assertThat(discovery.discover()).singleElement().satisfies(view -> {
			assertThat(view.id()).isEqualTo("corporate-oidc");
			assertThat(view.interaction().name()).isEqualTo("REDIRECT");
		});
		assertThat(queries.findAll()).containsExactly(provider);
		assertThat(queries.findById("corporate-oidc")).isSameAs(provider);
	}

	private static ProviderRequest request() {
		return new ProviderRequest("corporate-oidc", "Corporate OIDC", ProviderType.OIDC, 10,
				Map.of("issuer-uri", "https://login.example", "client-secret-reference", "secret://oidc/client"),
				Map.of("subject", "sub", "username", "preferred_username"));
	}

	private static IdentityProviderDefinition provider() {
		return IdentityProviderDefinition.draft(new ProviderId("corporate-oidc"), "Corporate OIDC",
				ProviderType.OIDC, 10,
				Map.of("issuer-uri", "https://login.example", "client-secret-reference", "secret://oidc/client"),
				Map.of("subject", "sub", "username", "preferred_username"), Instant.EPOCH);
	}
}
