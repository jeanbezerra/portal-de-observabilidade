package com.porto.ciops.coa.obs.identityaccess.security;

import com.porto.ciops.coa.obs.identityaccess.authorization.domain.RolePermissionResolver;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.IdentityDirectory;
import com.porto.ciops.coa.obs.identityaccess.identity.domain.PlatformIdentity;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
class AccessEntitlementsFilter extends OncePerRequestFilter {

	private final IdentityDirectory directory;
	private final RolePermissionResolver resolver;
	private final SecurityContextRepository contexts;

	AccessEntitlementsFilter(
		IdentityDirectory directory,
		RolePermissionResolver resolver,
		SecurityContextRepository contexts
	) {
		this.directory = directory;
		this.resolver = resolver;
		this.contexts = contexts;
	}

	@Override
	protected void doFilterInternal(
		HttpServletRequest request,
		HttpServletResponse response,
		FilterChain chain
	) throws ServletException, IOException {
		var context = SecurityContextHolder.getContext();
		var authentication = context.getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof PlatformPrincipal principal) {
			if (!directory.enabled(principal.subject())) {
				var session = request.getSession(false);
				if (session != null) session.invalidate();
				SecurityContextHolder.clearContext();
				response.sendError(401);
				return;
			}
			var current = resolver.resolve(principal.subject(), principal.providerId(), principal.groups());
			if (
				!current.roles().equals(principal.roles()) ||
				!current.permissions().equals(principal.permissions())
			) {
				var identity = new PlatformIdentity(
					principal.subject(),
					principal.username(),
					principal.email(),
					principal.displayName(),
					principal.providerId(),
					principal.groups(),
					current.roles(),
					current.permissions(),
					principal.attributes()
				);
				context.setAuthentication(PlatformAuthenticationFactory.authenticated(identity));
				contexts.saveContext(context, request, response);
			}
		}
		chain.doFilter(request, response);
	}
}
