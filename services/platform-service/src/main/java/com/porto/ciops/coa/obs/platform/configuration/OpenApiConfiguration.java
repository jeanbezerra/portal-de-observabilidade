package com.porto.ciops.coa.obs.platform.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

	@Bean
	OpenAPI platformServiceOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Platform Service API")
						.description("API de experiência compartilhada do Portal de Observabilidade.")
						.version("v1")
						.contact(new Contact().name("CIOPS - COA")));
	}
}
