package com.porto.ciops.coa.obs.identityaccess;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderAdministrationService;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderQueryService;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderUpsertCommand;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderStatus;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@Testcontainers(disabledWithoutDocker = true)
class IdentityAccessPersistenceIntegrationTest {
	@Autowired
	ProviderAdministrationService administrationService;

	@Autowired
	ProviderQueryService queryService;

	@Container
	static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(
			DockerImageName.parse("postgres:18-alpine"))
			.withDatabaseName("identity_access").withUsername("identity").withPassword("identity");

	@Container
	static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:8-alpine"))
			.withExposedPorts(6379);

	@DynamicPropertySource
	static void properties(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", POSTGRES::getUsername);
		registry.add("spring.datasource.password", POSTGRES::getPassword);
		registry.add("spring.data.redis.host", REDIS::getHost);
		registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
		registry.add("spring.session.store-type", () -> "none");
	}

	@Test
	void migratesAndPersistsTheProviderLifecycle() {
		ProviderUpsertCommand command = new ProviderUpsertCommand("corporate-oidc", "Corporate OIDC",
				ProviderType.OIDC, 1, Map.of(
						"issuer-uri", "https://login.example/tenant",
						"client-id", "obs-portal",
						"client-secret-reference", "secret://identity/oidc/client-secret"),
				Map.of("subject", "sub", "username", "preferred_username"));

		administrationService.create(command, "integration-test");
		administrationService.validate(command.id(), "integration-test");
		administrationService.enable(command.id(), "integration-test");

		assertThat(queryService.findById(command.id()).status()).isEqualTo(ProviderStatus.ENABLED);
		assertThat(queryService.discoverEnabled()).singleElement()
				.extracting(com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderDiscoveryView::id)
				.isEqualTo("corporate-oidc");
	}
}
