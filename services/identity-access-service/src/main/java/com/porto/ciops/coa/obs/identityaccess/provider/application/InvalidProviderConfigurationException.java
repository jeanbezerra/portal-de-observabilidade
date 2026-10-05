package com.porto.ciops.coa.obs.identityaccess.provider.application;

import java.io.Serial;
import java.util.List;

public class InvalidProviderConfigurationException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	private final List<String> violations;

	public InvalidProviderConfigurationException(List<String> violations) {
		super("Identity provider configuration is invalid");
		this.violations = List.copyOf(violations);
	}

	public List<String> violations() {
		return violations;
	}
}
