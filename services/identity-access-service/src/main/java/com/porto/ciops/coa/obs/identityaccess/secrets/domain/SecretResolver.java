package com.porto.ciops.coa.obs.identityaccess.secrets.domain;

@FunctionalInterface
public interface SecretResolver {

	SecretValue resolve(SecretReference reference);
}
