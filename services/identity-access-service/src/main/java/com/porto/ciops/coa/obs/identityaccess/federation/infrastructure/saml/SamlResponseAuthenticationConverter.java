package com.porto.ciops.coa.obs.identityaccess.federation.infrastructure.saml;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import com.porto.ciops.coa.obs.identityaccess.federation.application.CompleteRedirectAuthenticationUseCase;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import com.porto.ciops.coa.obs.identityaccess.security.PlatformAuthenticationFactory;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.saml2.provider.service.authentication.OpenSaml5AuthenticationProvider;
import org.springframework.security.saml2.provider.service.authentication.Saml2AssertionAuthentication;
import org.springframework.security.saml2.provider.service.authentication.Saml2Authentication;
import org.springframework.security.saml2.provider.service.authentication.Saml2ResponseAssertionAccessor;

public class SamlResponseAuthenticationConverter implements
		Converter<OpenSaml5AuthenticationProvider.ResponseToken, AbstractAuthenticationToken> {

	private final CompleteRedirectAuthenticationUseCase completeAuthentication;
	private final Converter<OpenSaml5AuthenticationProvider.ResponseToken, Saml2Authentication> delegate =
			new OpenSaml5AuthenticationProvider.ResponseAuthenticationConverter();

	public SamlResponseAuthenticationConverter(CompleteRedirectAuthenticationUseCase completeAuthentication) {
		this.completeAuthentication = completeAuthentication;
	}

	@Override
	public AbstractAuthenticationToken convert(OpenSaml5AuthenticationProvider.ResponseToken responseToken) {
		try {
			Saml2Authentication validated = delegate.convert(responseToken);
			if (!(validated instanceof Saml2AssertionAuthentication assertionAuthentication)) {
				throw new AuthenticationServiceException("The SAML identity could not be normalized");
			}
			Saml2ResponseAssertionAccessor assertion = assertionAuthentication.getCredentials();
			if (assertion == null) {
				throw new AuthenticationServiceException("The SAML identity could not be normalized");
			}
			String registrationId = responseToken.getToken().getRelyingPartyRegistration().getRegistrationId();
			PlatformIdentity identity = completeAuthentication.completeSaml(registrationId,
					assertion.getNameId(), portableAttributes(assertion.getAttributes()));
			return PlatformAuthenticationFactory.authenticated(identity);
		}
		catch (org.springframework.security.core.AuthenticationException exception) {
			throw exception;
		}
		catch (RuntimeException exception) {
			throw new AuthenticationServiceException("The SAML identity could not be normalized", exception);
		}
	}

	static Map<String, Object> portableAttributes(Map<String, List<Object>> attributes) {
		Map<String, Object> portable = new LinkedHashMap<>();
		attributes.forEach((String name, List<Object> values) -> addPortableAttribute(portable, name, values));
		return Map.copyOf(portable);
	}

	private static void addPortableAttribute(Map<String, Object> portable, String name, List<Object> values) {
		if (values == null || values.isEmpty()) {
			return;
		}
		List<String> textValues = values.stream().filter(Objects::nonNull).map(String::valueOf).toList();
		if (textValues.isEmpty()) {
			return;
		}
		portable.put(name, textValues.size() == 1 ? textValues.getFirst() : textValues);
	}
}
