package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class SamlResponseAuthenticationConverterTest {

	@Test
	void convertsOnlyPortableAttributeValuesAndPreservesMultipleGroups() {
		Map<String, List<Object>> rawAttributes = new LinkedHashMap<>();
		rawAttributes.put("emailaddress", List.of("maria@example.com"));
		rawAttributes.put("groups", List.of("operations", "observability"));
		rawAttributes.put("optional", new ArrayList<>(java.util.Collections.singletonList(null)));

		Map<String, Object> attributes = SamlResponseAuthenticationConverter.portableAttributes(rawAttributes);

		assertThat(attributes).containsEntry("emailaddress", "maria@example.com")
				.containsEntry("groups", List.of("operations", "observability"))
				.doesNotContainKey("optional");
	}

	@Test
	void ignoresNullAndEmptyAttributeCollections() {
		Map<String, List<Object>> rawAttributes = new LinkedHashMap<>();
		rawAttributes.put("null-values", null);
		rawAttributes.put("empty-values", List.of());
		List<Object> onePortableValue = new ArrayList<>();
		onePortableValue.add(null);
		onePortableValue.add(42);
		rawAttributes.put("numeric", onePortableValue);

		Map<String, Object> attributes = SamlResponseAuthenticationConverter.portableAttributes(rawAttributes);

		assertThat(attributes).containsEntry("numeric", "42")
				.doesNotContainKeys("null-values", "empty-values");
	}
}
