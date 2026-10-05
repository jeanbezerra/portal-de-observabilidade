package com.porto.ciops.coa.obs.identityaccess.identity.domain;

import java.util.Optional;

public interface IdentityRepository {

	Optional<PlatformIdentity> findBySubject(String subject);

	PlatformIdentity save(PlatformIdentity identity);
}
