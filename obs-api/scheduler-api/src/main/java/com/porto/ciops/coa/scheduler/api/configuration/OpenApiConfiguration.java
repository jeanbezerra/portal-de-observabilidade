package com.porto.ciops.coa.scheduler.api.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

	@Bean
	OpenAPI schedulerApiOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Scheduler API")
						.description("API administrativa para gestão do Quartz Scheduler.")
						.version("v1")
						.contact(new Contact().name("CIOPS - COA")));
	}
}
