package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.http;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.HttpRequestConfiguration;
import com.sun.net.httpserver.HttpsConfigurator;
import com.sun.net.httpserver.HttpsServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class HttpRequestJobExecutorTlsTests {

	private static final char[] KEY_PASSWORD = "changeit".toCharArray();
	@TempDir
	private static Path temporaryDirectory;
	private static HttpsServer targetServer;

	@BeforeAll
	static void startTargetServer() throws Exception {
		createTestKeyStore();
		targetServer = HttpsServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		targetServer.setHttpsConfigurator(new HttpsConfigurator(serverSslContext()));
		targetServer.createContext("/health", exchange -> {
			exchange.sendResponseHeaders(204, -1);
			exchange.close();
		});
		targetServer.start();
	}

	@AfterAll
	static void stopTargetServer() {
		if (targetServer != null) {
			targetServer.stop(0);
		}
	}

	@Test
	void shouldUseInsecureTlsOnlyWhenExplicitlyEnabled() throws Exception {
		HttpRequestJobExecutor executor = new HttpRequestJobExecutor(null, null, null, null, "*", true);
		HttpRequestJobExecutor secureExecutor = new HttpRequestJobExecutor(null, null, null, null, "*", false);
		URI uri = URI.create("https://127.0.0.1:" + targetServer.getAddress().getPort() + "/health");
		HttpRequest request = HttpRequest.newBuilder(uri).GET().build();
		HttpResponse.BodyHandler<Void> discardBody = HttpResponse.BodyHandlers.discarding();
		HttpRequestConfiguration insecureConfiguration = configuration(uri, true);

		try (HttpClient strictClient = executor.buildClient(configuration(uri, false))) {
			assertThatThrownBy(() -> strictClient.send(request, discardBody))
					.isInstanceOf(SSLException.class);
		}
		assertThatThrownBy(() -> secureExecutor.buildClient(insecureConfiguration))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("habilita explicitamente");

		try (HttpClient insecureClient = executor.buildClient(insecureConfiguration)) {
			HttpResponse<Void> response = insecureClient.send(request, discardBody);
			assertThat(response.statusCode()).isEqualTo(204);
		}
	}

	private static HttpRequestConfiguration configuration(URI uri, boolean ignoreTlsValidation) {
		return new HttpRequestConfiguration(
				"GET",
				uri.toString(),
				List.of(),
				List.of(),
				List.of(),
				null,
				"NONE",
				"",
				List.of(),
				"",
				5,
				5,
				ignoreTlsValidation,
				"NEVER",
				"HTTP_1_1",
				List.of(204),
				65_536,
				null);
	}

	// The TLS context must keep production-grade randomness in this integration test.
	@SuppressWarnings("java:S5977")
	private static SSLContext serverSslContext() throws Exception {
		KeyStore keyStore = KeyStore.getInstance("PKCS12");
		try (var input = Files.newInputStream(temporaryDirectory.resolve("server.p12"))) {
			keyStore.load(input, KEY_PASSWORD);
		}
		KeyManagerFactory keyManagerFactory = KeyManagerFactory
				.getInstance(KeyManagerFactory.getDefaultAlgorithm());
		keyManagerFactory.init(keyStore, KEY_PASSWORD);

		SSLContext context = SSLContext.getInstance("TLS");
		context.init(keyManagerFactory.getKeyManagers(), null, new SecureRandom());
		return context;
	}

	private static void createTestKeyStore() throws Exception {
		String executable = System.getProperty("os.name").startsWith("Windows") ? "keytool.exe" : "keytool";
		Path keytool = Path.of(System.getProperty("java.home"), "bin", executable);
		Process process = new ProcessBuilder(
				keytool.toString(),
				"-genkeypair",
				"-alias", "server",
				"-keyalg", "RSA",
				"-storetype", "PKCS12",
				"-keystore", temporaryDirectory.resolve("server.p12").toString(),
				"-storepass", String.valueOf(KEY_PASSWORD),
				"-keypass", String.valueOf(KEY_PASSWORD),
				"-dname", "CN=wrong-host.example",
				"-ext", "SAN=DNS:wrong-host.example",
				"-validity", "3650",
				"-noprompt")
				.redirectErrorStream(true)
				.start();
		boolean finished = process.waitFor(30, TimeUnit.SECONDS);
		String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
		if (!finished) {
			process.destroyForcibly();
			throw new IllegalStateException("A geração do certificado TLS de teste excedeu 30 segundos.");
		}
		if (process.exitValue() != 0) {
			throw new IllegalStateException("Não foi possível gerar o certificado TLS de teste: " + output);
		}
	}
}
