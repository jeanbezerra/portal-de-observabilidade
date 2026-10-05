package com.porto.ciops.coa.obs.identityaccess.provider.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

interface SpringDataIdentityProviderRepository extends JpaRepository<IdentityProviderEntity, UUID> {

	String CONFIGURATION = "configuration";
	String ATTRIBUTE_MAPPINGS = "attributeMappings";

	@EntityGraph(attributePaths = { CONFIGURATION, ATTRIBUTE_MAPPINGS })
	Optional<IdentityProviderEntity> findByProviderKey(String providerKey);

	boolean existsByProviderKey(String providerKey);

	@EntityGraph(attributePaths = { CONFIGURATION, ATTRIBUTE_MAPPINGS })
	List<IdentityProviderEntity> findAllByOrderByPriorityAscDisplayNameAsc();

	@EntityGraph(attributePaths = { CONFIGURATION, ATTRIBUTE_MAPPINGS })
	List<IdentityProviderEntity> findByStatusOrderByPriorityAscDisplayNameAsc(ProviderStatus status);

	@EntityGraph(attributePaths = { CONFIGURATION, ATTRIBUTE_MAPPINGS })
	List<IdentityProviderEntity> findByTypeOrderByPriorityAscDisplayNameAsc(ProviderType type);
}
