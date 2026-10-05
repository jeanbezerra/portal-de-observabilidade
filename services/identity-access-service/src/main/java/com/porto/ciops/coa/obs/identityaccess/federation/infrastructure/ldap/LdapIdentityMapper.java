package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.ldap;

import java.util.ArrayList;
import java.util.Base64;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.ProviderType;
import org.springframework.ldap.core.ContextSource;
import org.springframework.ldap.core.DirContextOperations;
import org.springframework.security.ldap.SpringSecurityLdapTemplate;

final class LdapIdentityMapper {

	private static final int SINGLE_ATTRIBUTE_VALUE = 1;

	private LdapIdentityMapper() {
	}

	static FederatedIdentity map(IdentityProviderDefinition provider, Map<String, String> configuration,
			ContextSource contextSource, DirContextOperations user, String username) {
		Map<String, Object> attributes = extractAttributes(provider, user);
		Set<String> groups = extractGroups(configuration, contextSource, user, username);
		String groupsAttribute = provider.attributeMappings().get("groups");
		if (groupsAttribute != null) {
			attributes.put(groupsAttribute, groups);
		}
		String subjectAttribute = provider.attributeMappings().get("subject");
		String externalSubject = firstText(attributes.get(subjectAttribute));
		if (externalSubject == null || externalSubject.isBlank()) {
			externalSubject = user.getNameInNamespace();
		}
		return new FederatedIdentity(externalSubject, provider.id(), ProviderType.LDAP, attributes);
	}

	private static Map<String, Object> extractAttributes(IdentityProviderDefinition provider,
			DirContextOperations user) {
		Map<String, Object> attributes = new LinkedHashMap<>();
		provider.attributeMappings().values().stream().distinct()
				.forEach((String attribute) -> extractAttribute(user, attributes, attribute));
		return attributes;
	}

	private static void extractAttribute(DirContextOperations user, Map<String, Object> attributes,
			String attribute) {
		Object[] values = user.getObjectAttributes(attribute);
		if (values == null || values.length == 0) {
			return;
		}
		if (values.length == SINGLE_ATTRIBUTE_VALUE) {
			attributes.put(attribute, portableValue(values[0]));
			return;
		}
		List<Object> mapped = new ArrayList<>(values.length);
		for (Object value : values) {
			mapped.add(portableValue(value));
		}
		attributes.put(attribute, List.copyOf(mapped));
	}

	private static Set<String> extractGroups(Map<String, String> configuration,
			ContextSource contextSource, DirContextOperations user, String username) {
		SpringSecurityLdapTemplate template = new SpringSecurityLdapTemplate(contextSource);
		return template.searchForSingleAttributeValues(configuration.get("group-search-base"),
				configuration.get("group-search-filter"), new Object[] { user.getNameInNamespace(), username },
				configuration.getOrDefault("group-role-attribute", "cn"));
	}

	private static Object portableValue(Object value) {
		return value instanceof byte[] bytes ? Base64.getEncoder().encodeToString(bytes) : String.valueOf(value);
	}

	private static String firstText(Object value) {
		if (value instanceof Collection<?> collection) {
			return collection.isEmpty() ? null : String.valueOf(collection.iterator().next());
		}
		return value == null ? null : String.valueOf(value);
	}
}
