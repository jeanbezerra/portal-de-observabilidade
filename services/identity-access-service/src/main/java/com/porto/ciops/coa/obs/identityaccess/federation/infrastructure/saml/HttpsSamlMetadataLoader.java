package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.springframework.stereotype.Component;

@Component
class HttpsSamlMetadataLoader implements SamlMetadataLoader {

	private static final int HTTP_SUCCESS_MINIMUM = 200;
	private static final int HTTP_SUCCESS_MAXIMUM_EXCLUSIVE = 300;

	@Override
	public byte[] load(URI metadataUri, Duration connectTimeout, Duration requestTimeout, int maximumBytes) {
		if (!"https".equalsIgnoreCase(metadataUri.getScheme())) {
			throw new IllegalArgumentException("SAML metadata must use HTTPS");
		}
		HttpRequest request = HttpRequest.newBuilder(metadataUri)
				.timeout(requestTimeout)
				.header("Accept", "application/samlmetadata+xml, application/xml;q=0.9, text/xml;q=0.8")
				.GET()
				.build();
		try (HttpClient client = HttpClient.newBuilder()
				.connectTimeout(connectTimeout)
				.followRedirects(HttpClient.Redirect.NORMAL)
				.build()) {
			HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
			return validatedBody(response, maximumBytes);
		}
		catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("The SAML metadata request was interrupted", exception);
		}
		catch (IOException exception) {
			throw new IllegalStateException("Unable to retrieve SAML metadata", exception);
		}
	}

	private static byte[] validatedBody(HttpResponse<InputStream> response, int maximumBytes) throws IOException {
		try (InputStream body = response.body()) {
			if (response.statusCode() < HTTP_SUCCESS_MINIMUM
					|| response.statusCode() >= HTTP_SUCCESS_MAXIMUM_EXCLUSIVE) {
				throw new IllegalStateException("The SAML metadata endpoint returned a non-success status");
			}
			if (!"https".equalsIgnoreCase(response.uri().getScheme())) {
				throw new IllegalStateException("The SAML metadata endpoint redirected to an insecure URI");
			}
			byte[] content = body.readNBytes(maximumBytes + 1);
			if (content.length > maximumBytes) {
				throw new IllegalStateException("The SAML metadata document exceeds the configured size limit");
			}
			return content;
		}
	}
}
