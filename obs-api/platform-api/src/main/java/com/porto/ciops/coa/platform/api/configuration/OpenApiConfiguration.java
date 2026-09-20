package com.porto.ciops.coa.platform.api.configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OpenApiConfiguration {

	@Bean
	OpenAPI platformApiOpenApi() {
		return new OpenAPI()
				.info(new Info()
						.title("Platform API")
						.description("API central da plataforma de observabilidade.")
						.version("v1")
						.contact(new Contact().name("CIOPS - COA")));
	}
}
