package com.porto.ciops.coa.obs.identityaccess.authorization.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationDecision;
import com.porto.ciops.coa.obs.identityaccess.authorization.domain.AuthorizationRequest;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.security.PlatformAuthenticationFactory;
import org.junit.jupiter.api.Test;

class AuthorizationControllerTest {

	@Test
	void convertsTheHttpContractToAnAuthorizationRequest() {
		AtomicReference<AuthorizationRequest> captured = new AtomicReference<>();
		AuthorizationDecision expected = new AuthorizationDecision(true, "granted", Set.of("operator"),
				Set.of("job:read"));
		AuthorizationController controller = new AuthorizationController(request -> {
			captured.set(request);
			return expected;
		});
		AuthorizationController.EvaluationRequest request = new AuthorizationController.EvaluationRequest(
				"untrusted-provider", "job:read", Set.of("untrusted-admin-group"), Map.of("region", "south"));

		var authentication = PlatformAuthenticationFactory.authenticated(new PlatformIdentity(
				"subject-1", "maria", null, "Maria", "corporate-oidc", Set.of("operations"),
				Set.of(), Set.of(), Map.of()));
		AuthorizationDecision result = controller.evaluate(request, authentication);

		assertThat(result).isSameAs(expected);
		assertThat(captured.get().subject()).isEqualTo("subject-1");
		assertThat(captured.get().permission().value()).isEqualTo("job:read");
		assertThat(captured.get().groups()).containsExactly("operations");
		assertThat(captured.get().providerId()).isEqualTo("corporate-oidc");
	}

	@Test
	void normalizesNullCollectionsAtTheApiBoundary() {
		AuthorizationController.EvaluationRequest request = new AuthorizationController.EvaluationRequest(
				"corporate-oidc", "job:read", null, null);

		assertThat(request.groups()).isEmpty();
		assertThat(request.attributes()).isEmpty();
	}
}
