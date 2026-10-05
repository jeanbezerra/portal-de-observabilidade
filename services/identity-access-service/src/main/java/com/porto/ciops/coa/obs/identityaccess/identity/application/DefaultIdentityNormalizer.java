package com.porto.ciops.coa.obs.identityaccess.identity.application;

import java.lang.reflect.Array;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import com.porto.ciops.coa.obs.identityaccess.federation.domain.FederatedIdentity;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.IdentityNormalizer;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.provider.application.ProviderNotFoundException;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderDefinition;
import com.porto.ciops.coa.obs.identityaccess.provider.domain.IdentityProviderRegistry;
import org.springframework.stereotype.Service;
import io.micrometer.observation.annotation.Observed;

@Service
public class DefaultIdentityNormalizer implements IdentityNormalizer {

	private static final Set<String> SENSITIVE_PARTS = Set.of("password", "secret", "token", "credential",
			"assertion", "private-key");
	private final IdentityProviderRegistry providerRegistry;
	private final RolePermissionResolver entitlements;

	public DefaultIdentityNormalizer(IdentityProviderRegistry providerRegistry, RolePermissionResolver entitlements) {
		this.providerRegistry = providerRegistry;
		this.entitlements = entitlements;
	}

	@Override
	@Observed(name = "identity.normalize")
	public PlatformIdentity normalize(FederatedIdentity identity) {
		IdentityProviderDefinition provider = providerRegistry.findById(identity.providerId())
				.orElseThrow(() -> new ProviderNotFoundException(identity.providerId()));
		String subject = stableSubject(identity);
		String username = requiredMappedValue(provider, identity, "username");
		String email = optionalMappedValue(provider, identity, "email");
		String displayName = optionalMappedValue(provider, identity, "displayName");
		Set<String> groups = mappedSet(provider, identity, "groups");
		RolePermissionResolver.ResolvedEntitlements resolved = entitlements.resolve(subject,
				provider.id().value(), groups);

		return new PlatformIdentity(subject, username, email,
				displayName == null ? username : displayName, provider.id().value(), groups,
				resolved.roles(), resolved.permissions(), safeAttributes(identity.attributes()));
	}

	private static String stableSubject(FederatedIdentity identity) {
		String source = identity.providerId().value() + "\0" + identity.externalSubject();
		return UUID.nameUUIDFromBytes(source.getBytes(StandardCharsets.UTF_8)).toString();
	}

	private static String requiredMappedValue(IdentityProviderDefinition provider,
			FederatedIdentity identity, String platformAttribute) {
		String value = optionalMappedValue(provider, identity, platformAttribute);
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException("Required mapped attribute is missing: " + platformAttribute);
		}
		return value;
	}

	private static String optionalMappedValue(IdentityProviderDefinition provider,
			FederatedIdentity identity, String platformAttribute) {
		String externalName = provider.attributeMappings().get(platformAttribute);
		if (externalName == null) {
			return null;
		}
		Object value = identity.attributes().get(externalName);
		return value == null ? null : String.valueOf(value).trim();
	}

	private static Set<String> mappedSet(IdentityProviderDefinition provider, FederatedIdentity identity,
			String platformAttribute) {
		String externalName = provider.attributeMappings().get(platformAttribute);
		if (externalName == null) {
			return Set.of();
		}
		Object value = identity.attributes().get(externalName);
		if (value == null) {
			return Set.of();
		}
		Set<String> result = new LinkedHashSet<>();
		if (value instanceof Collection<?> collection) {
			collection.forEach(item -> addValue(result, item));
		}
		else if (value.getClass().isArray()) {
			for (int index = 0; index < Array.getLength(value); index++) {
				addValue(result, Array.get(value, index));
			}
		}
		else {
			Arrays.stream(String.valueOf(value).split(",")).forEach(item -> addValue(result, item));
		}
		return Set.copyOf(result);
	}

	private static void addValue(Set<String> result, Object value) {
		if (value != null && !String.valueOf(value).isBlank()) {
			result.add(String.valueOf(value).trim());
		}
	}

	private static Map<String, Object> safeAttributes(Map<String, Object> attributes) {
		Map<String, Object> safe = new LinkedHashMap<>();
		attributes.forEach((String key, Object value) -> {
			String normalized = key.toLowerCase(Locale.ROOT);
			if (SENSITIVE_PARTS.stream().noneMatch(normalized::contains)) {
				safe.put(key, value);
			}
		});
		return Map.copyOf(safe);
	}
}
