package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.http;

import java.net.Socket;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509ExtendedTrustManager;

final class InsecureTlsSupport {

	private static final X509ExtendedTrustManager TRUST_ALL_CERTIFICATES = new TrustAllCertificatesManager();

	private InsecureTlsSupport() {
	}

	static SSLContext createContext() {
		try {
			SSLContext context = SSLContext.getInstance("TLS");
			context.init(null, new TrustManager[] { TRUST_ALL_CERTIFICATES }, new SecureRandom());
			return context;
		}
		catch (GeneralSecurityException exception) {
			throw new IllegalStateException("Não foi possível configurar o modo SSL/TLS inseguro.", exception);
		}
	}

	private static final class TrustAllCertificatesManager extends X509ExtendedTrustManager {

		@Override
		public void checkClientTrusted(X509Certificate[] chain, String authType) {
			// Explicit compatibility mode: both configured opt-ins authorize this chain.
		}

		@Override
		public void checkServerTrusted(X509Certificate[] chain, String authType) {
			// Explicit compatibility mode: both configured opt-ins authorize this chain.
		}

		@Override
		public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket) {
			checkClientTrusted(chain, authType);
		}

		@Override
		public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) {
			checkServerTrusted(chain, authType);
		}

		@Override
		public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {
			checkClientTrusted(chain, authType);
		}

		@Override
		public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {
			checkServerTrusted(chain, authType);
		}

		@Override
		public X509Certificate[] getAcceptedIssuers() {
			return new X509Certificate[0];
		}
	}
}
