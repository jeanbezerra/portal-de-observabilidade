package com.porto.ciops.coa.obs.identityaccess.provider.domain;

public enum ProviderInteraction {
	REDIRECT,
	CREDENTIALS;

	public static ProviderInteraction forType(ProviderType type) {
		return type == ProviderType.LDAP ? CREDENTIALS : REDIRECT;
	}
}
