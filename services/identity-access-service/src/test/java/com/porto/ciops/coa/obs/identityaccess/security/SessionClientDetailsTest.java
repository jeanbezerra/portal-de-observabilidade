package com.porto.ciops.coa.obs.identityaccess.security;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class SessionClientDetailsTest {
	@Test void classifiesOnlyCoarseBrowserAndDeviceLabels() {
		assertThat(SessionClientDetails.classify("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36 Edg/130.0", "local"))
			.isEqualTo(new SessionClientDetails("Microsoft Edge", "Windows", "Computador", "local"));
		assertThat(SessionClientDetails.classify("Mozilla/5.0 (iPhone; CPU iPhone OS) AppleWebKit Mobile Safari/604", "saml").device()).isEqualTo("Celular");
		assertThat(SessionClientDetails.classify(null, null).browser()).isEqualTo("Não identificado");
		assertThat(SessionClientDetails.classify("Mozilla/5.0 (Linux; Android 14) Chrome/130 Safari/537", "local").device()).isEqualTo("Tablet");
	}
}
