package com.porto.ciops.coa.obs.identityaccess.secrets.infrastructure;

import com.porto.ciops.coa.obs.identityaccess.secrets.domain.SecretResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class SecretConfiguration {

	@Bean
	SecretResolver environmentSecretResolver() {
		return new EnvironmentSecretResolver();
	}
}
