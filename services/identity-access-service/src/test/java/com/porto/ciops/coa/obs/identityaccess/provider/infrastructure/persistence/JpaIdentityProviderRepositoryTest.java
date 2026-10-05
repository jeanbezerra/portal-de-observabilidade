package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;

class JpaIdentityProviderRepositoryTest {

	@Test
	void persistsAndReconstitutesProviderAggregates() {
		SpringDataIdentityProviderRepository springData = mock(SpringDataIdentityProviderRepository.class);
		JpaIdentityProviderRepository repository = new JpaIdentityProviderRepository(springData);
		IdentityProviderDefinition provider = provider();
		when(springData.findByProviderKey(provider.id().value())).thenReturn(Optional.empty());
		when(springData.save(any(IdentityProviderEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

		IdentityProviderDefinition saved = repository.save(provider);

		assertThat(saved.id()).isEqualTo(provider.id());
		assertThat(saved.configuration()).isEqualTo(provider.configuration());
		assertThat(saved.attributeMappings()).isEqualTo(provider.attributeMappings());
		assertThat(saved.version()).isZero();
	}

	@Test
	void delegatesAllRepositoryQueriesAndMapsEntities() {
		SpringDataIdentityProviderRepository springData = mock(SpringDataIdentityProviderRepository.class);
		JpaIdentityProviderRepository repository = new JpaIdentityProviderRepository(springData);
		IdentityProviderDefinition provider = provider();
		IdentityProviderEntity entity = IdentityProviderEntity.create(provider);
		when(springData.existsByProviderKey(provider.id().value())).thenReturn(Boolean.TRUE);
		when(springData.findByProviderKey(provider.id().value())).thenReturn(Optional.of(entity));
		when(springData.findAllByOrderByPriorityAscDisplayNameAsc()).thenReturn(List.of(entity));
		when(springData.findByStatusOrderByPriorityAscDisplayNameAsc(ProviderStatus.ENABLED))
				.thenReturn(List.of(entity));
		when(springData.findByTypeOrderByPriorityAscDisplayNameAsc(ProviderType.OIDC)).thenReturn(List.of(entity));

		assertThat(repository.existsById(provider.id())).isTrue();
		assertThat(repository.findById(provider.id())).isPresent();
		assertThat(repository.findAll()).singleElement().extracting(IdentityProviderDefinition::id)
				.isEqualTo(provider.id());
		assertThat(repository.findEnabled()).hasSize(1);
		assertThat(repository.findByType(ProviderType.OIDC)).hasSize(1);
	}

	private static IdentityProviderDefinition provider() {
		return IdentityProviderDefinition.reconstitute(new ProviderId("corporate-oidc"), "Corporate OIDC",
				ProviderType.OIDC, com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderInteraction.REDIRECT,
				ProviderStatus.ENABLED, 10,
				Map.of("issuer-uri", "https://login.example"),
				Map.of("subject", "sub", "username", "preferred_username"),
				Instant.EPOCH, Instant.EPOCH.plusSeconds(1), 3);
	}
}
