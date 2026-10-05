package com.porto.ciops.coa.obs.identityaccess;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@ConfigurationPropertiesScan
@EnableCaching
@EnableJpaAuditing
public class IdentityAccessServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(IdentityAccessServiceApplication.class, args);
	}

}
