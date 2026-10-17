package com.porto.ciops.coa.obs.identityaccess.security;

import com.porto.ciops.coa.obs.identityaccess.administration.application.AccessAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.administration.domain.AccessStore;
import java.util.Set;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
class LocalAdministratorBootstrap implements ApplicationRunner {

	private final AccessAdministrationService administration;
	private final AccessStore store;
	private final Environment environment;

	LocalAdministratorBootstrap(
		AccessAdministrationService administration,
		AccessStore store,
		Environment environment
	) {
		this.administration = administration;
		this.store = store;
		this.environment = environment;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments arguments) {
		String password = environment.getProperty("BOOTSTRAP_ADMIN_PASSWORD", "");
		if (password.isBlank()) return;
		store.lockAdministration();
		if (!store.users().isEmpty()) return;
		String username = environment.getProperty("BOOTSTRAP_ADMIN_USERNAME", "admin");
		administration.saveUser(
			null,
			username,
			"Administrador",
			null,
			true,
			Set.of("OBS_ADMIN"),
			Set.of(),
			password,
			"system-bootstrap"
		);
	}
}
