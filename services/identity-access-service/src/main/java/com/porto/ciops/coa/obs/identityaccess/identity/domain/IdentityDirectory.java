package com.porto.ciops.coa.obs.identityaccess.identity.domain;

public interface IdentityDirectory {
	PlatformIdentity register(PlatformIdentity identity, String externalSubject);
	boolean enabled(String subject);
}
