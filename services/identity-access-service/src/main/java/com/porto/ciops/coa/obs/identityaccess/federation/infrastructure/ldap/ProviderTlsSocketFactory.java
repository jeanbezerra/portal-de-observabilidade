package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.ldap;

import java.io.IOException;
import java.net.InetAddress;
import java.net.Socket;

import javax.net.ssl.SSLSocketFactory;

public final class ProviderTlsSocketFactory extends SSLSocketFactory {

	private static final ThreadLocal<SSLSocketFactory> CURRENT = new ThreadLocal<>();
	private static final Scope NO_TLS_SCOPE = () -> {
		// No provider-specific TLS context was installed.
	};
	private final SSLSocketFactory delegate;

	public ProviderTlsSocketFactory() {
		SSLSocketFactory configured = CURRENT.get();
		if (configured == null) {
			throw new IllegalStateException("No provider-specific TLS context is active");
		}
		this.delegate = configured;
	}

	public static ProviderTlsSocketFactory getDefault() {
		return new ProviderTlsSocketFactory();
	}

	static Scope use(SSLSocketFactory socketFactory) {
		if (CURRENT.get() != null) {
			throw new IllegalStateException("A provider-specific TLS context is already active");
		}
		CURRENT.set(socketFactory);
		return ProviderTlsSocketFactory::clearCurrent;
	}

	private static void clearCurrent() {
		CURRENT.remove();
	}

	static Scope noTls() {
		return NO_TLS_SCOPE;
	}

	@Override
	public String[] getDefaultCipherSuites() {
		return delegate.getDefaultCipherSuites();
	}

	@Override
	public String[] getSupportedCipherSuites() {
		return delegate.getSupportedCipherSuites();
	}

	@Override
	public Socket createSocket(Socket socket, String host, int port, boolean autoClose) throws IOException {
		return delegate.createSocket(socket, host, port, autoClose);
	}

	@Override
	public Socket createSocket(String host, int port) throws IOException {
		return delegate.createSocket(host, port);
	}

	@Override
	public Socket createSocket(String host, int port, InetAddress localHost, int localPort) throws IOException {
		return delegate.createSocket(host, port, localHost, localPort);
	}

	@Override
	public Socket createSocket(InetAddress host, int port) throws IOException {
		return delegate.createSocket(host, port);
	}

	@Override
	public Socket createSocket(InetAddress address, int port, InetAddress localAddress, int localPort)
			throws IOException {
		return delegate.createSocket(address, port, localAddress, localPort);
	}

	@FunctionalInterface
	interface Scope extends AutoCloseable {
		@Override
		void close();
	}
}
