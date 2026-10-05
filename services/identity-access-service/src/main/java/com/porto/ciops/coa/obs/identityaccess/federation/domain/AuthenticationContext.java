package com.porto.ciops.coa.obs.identityaccess.federation.domain;

import java.net.URI;

public record AuthenticationContext(URI returnUri, String correlationId) {
}
