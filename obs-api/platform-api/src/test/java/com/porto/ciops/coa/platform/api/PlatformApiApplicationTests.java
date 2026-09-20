package com.porto.ciops.coa.platform.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webtestclient.autoconfigure.AutoConfigureWebTestClient;
import org.springframework.test.web.reactive.server.WebTestClient;

@SpringBootTest
@AutoConfigureWebTestClient
class PlatformApiApplicationTests {

	@Autowired
	private WebTestClient webTestClient;

	@Test
	void contextLoads() {
	}

	@Test
	void shouldExposeSwaggerAtApplicationRoot() {
		webTestClient.get()
				.uri("/")
				.exchange()
				.expectStatus().is3xxRedirection()
				.expectHeader().valueEquals("Location", "/swagger-ui/index.html");
	}

	@Test
	void shouldExposeCustomizedOpenApiDescription() {
		webTestClient.get()
				.uri("/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody()
				.jsonPath("$.info.title").isEqualTo("Platform API")
				.jsonPath("$.info.description").isEqualTo("API central da plataforma de observabilidade.")
				.jsonPath("$.info.version").isEqualTo("v1")
				.jsonPath("$.info.contact.name").isEqualTo("CIOPS - COA");
	}

}
