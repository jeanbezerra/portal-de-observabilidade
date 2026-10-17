package com.porto.ciops.coa.obs.identityaccess.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import org.springframework.security.core.Authentication;
import org.springframework.session.Session;

/** Coarse, self-reported client labels. No raw user agent, IP or fingerprint is retained. */
public record SessionClientDetails(String browser, String operatingSystem, String device, String providerId) {

	private static final String PREFIX = "obs.client.";

	public static void capture(Authentication authentication, HttpServletRequest request) {
		var details = classify(request.getHeader("User-Agent"),
			authentication.getPrincipal() instanceof PlatformPrincipal principal ? principal.providerId() : null);
		var session = request.getSession(true);
		session.setAttribute(PREFIX + "browser", details.browser());
		session.setAttribute(PREFIX + "os", details.operatingSystem());
		session.setAttribute(PREFIX + "device", details.device());
		if (details.providerId() != null) session.setAttribute(PREFIX + "provider", details.providerId());
		else session.removeAttribute(PREFIX + "provider");
	}

	public static SessionClientDetails from(Session session) {
		return new SessionClientDetails(session.getAttribute(PREFIX + "browser"),
			session.getAttribute(PREFIX + "os"), session.getAttribute(PREFIX + "device"),
			session.getAttribute(PREFIX + "provider"));
	}

	static SessionClientDetails classify(String userAgent, String providerId) {
		String ua = userAgent == null ? "" : userAgent.substring(0, Math.min(1024, userAgent.length())).toLowerCase(Locale.ROOT);
		String browser = ua.contains("edg/") || ua.contains("edga/") || ua.contains("edgios/") ? "Microsoft Edge"
			: ua.contains("opr/") || ua.contains("opera") ? "Opera"
			: ua.contains("firefox/") || ua.contains("fxios/") ? "Firefox"
			: ua.contains("chrome/") || ua.contains("crios/") ? "Chrome"
			: ua.contains("safari/") ? "Safari" : "Não identificado";
		String os = ua.contains("android") ? "Android" : ua.contains("iphone") || ua.contains("ipad") ? "iOS / iPadOS"
			: ua.contains("windows") ? "Windows" : ua.contains("macintosh") || ua.contains("mac os") ? "macOS"
			: ua.contains("linux") ? "Linux" : "Não identificado";
		String device = ua.contains("ipad") || (ua.contains("android") && !ua.contains("mobile")) ? "Tablet"
			: ua.contains("mobile") || ua.contains("iphone") ? "Celular"
			: !os.equals("Não identificado") ? "Computador" : "Não identificado";
		return new SessionClientDetails(browser, os, device, providerId);
	}
}
