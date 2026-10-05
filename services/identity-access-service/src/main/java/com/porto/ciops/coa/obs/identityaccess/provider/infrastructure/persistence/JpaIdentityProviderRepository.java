package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure.persistence;

import java.util.List;
import java.util.Optional;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRepository;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderId;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.springframework.stereotype.Repository;

@Repository
class JpaIdentityProviderRepository implements IdentityProviderRepository {

	private final SpringDataIdentityProviderRepository repository;

	JpaIdentityProviderRepository(SpringDataIdentityProviderRepository repository) {
		this.repository = repository;
	}

	@Override
	public IdentityProviderDefinition save(IdentityProviderDefinition provider) {
		IdentityProviderEntity entity = repository.findByProviderKey(provider.id().value())
				.orElseGet(() -> IdentityProviderEntity.create(provider));
		entity.copyFrom(provider);
		return repository.save(entity).toDomain();
	}

	@Override
	public boolean existsById(ProviderId providerId) {
		return repository.existsByProviderKey(providerId.value());
	}

	@Override
	public Optional<IdentityProviderDefinition> findById(ProviderId providerId) {
		return repository.findByProviderKey(providerId.value()).map(IdentityProviderEntity::toDomain);
	}

	@Override
	public List<IdentityProviderDefinition> findEnabled() {
		return map(repository.findByStatusOrderByPriorityAscDisplayNameAsc(ProviderStatus.ENABLED));
	}

	@Override
	public List<IdentityProviderDefinition> findByType(ProviderType type) {
		return map(repository.findByTypeOrderByPriorityAscDisplayNameAsc(type));
	}

	@Override
	public List<IdentityProviderDefinition> findAll() {
		return map(repository.findAllByOrderByPriorityAscDisplayNameAsc());
	}

	private static List<IdentityProviderDefinition> map(List<IdentityProviderEntity> entities) {
		return entities.stream().map(IdentityProviderEntity::toDomain).toList();
	}
}
