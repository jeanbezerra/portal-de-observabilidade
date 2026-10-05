package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.net.URI;
import java.time.Duration;

@FunctionalInterface
interface SamlMetadataLoader {

	byte[] load(URI metadataUri, Duration connectTimeout, Duration requestTimeout, int maximumBytes);
}
