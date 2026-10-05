package com.porto.ciops.coa.obs.identityaccess.security;

import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import jakarta.validation.Valid;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimAccessor;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

@Configuration(proxyBeanMethods = false)
class JwtDecoderConfiguration {

	@Bean
	JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthoritiesClaimName("permissions");
		authorities.setAuthorityPrefix("");
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}

	@Bean
	@ConditionalOnProperty(prefix = "obs.identity.token", name = "resource-server-enabled", havingValue = "true")
	JwtDecoder jwtDecoder(@Valid IdentityAccessProperties properties) {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.token().jwkSetUri()).build();
		OAuth2TokenValidator<Jwt> issuer = JwtValidators.createDefaultWithIssuer(
				properties.token().issuer().toString());
		OAuth2TokenValidator<Jwt> audience = token -> validateAudience(token, properties.token().audience());
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(issuer, audience));
		return decoder;
	}

	static OAuth2TokenValidatorResult validateAudience(JwtClaimAccessor token, String requiredAudience) {
		var audiences = token.getAudience();
		if (audiences != null && audiences.contains(requiredAudience)) {
			return OAuth2TokenValidatorResult.success();
		}
		return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token",
				"The token audience is invalid", null));
	}
}
