package com.porto.ciops.coa.workflow.api.configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {

    @Bean
    OpenAPI workflowApiOpenApi() {
        return new OpenAPI()
                .components(new Components())
                .info(new Info()
                        .title("Workflow API")
                        .description("Execucao e acompanhamento de processos corporativos com Apache KIE Kogito.")
                        .version("v1")
                        .contact(new Contact().name("CIOPS/COA"))
                        .license(new License()
                                .name("Apache License 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
