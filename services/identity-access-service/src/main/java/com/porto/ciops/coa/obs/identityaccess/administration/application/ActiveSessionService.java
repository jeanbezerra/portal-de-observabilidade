package com.porto.ciops.coa.obs.identityaccess.administration.application;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import com.porto.ciops.coa.obs.identityaccess.security.SessionClientDetails;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

@Service
public class ActiveSessionService {

	public record SessionView(
		String reference,
		String subject,
		Instant createdAt,
		Instant lastAccessedAt,
		Instant expiresAt,
		boolean current,
		Instant idleExpiresAt,
		Instant absoluteExpiresAt,
		String browser,
		String operatingSystem,
		String device,
		String providerId
	) {}

	public record SessionOverview(String subject, Instant checkedAt, List<SessionView> items) {}
	public enum RevocationReason { USER_REQUEST, SUSPICIOUS_ACTIVITY, SHARED_DEVICE, ADMINISTRATIVE }
	public record RevocationResult(int revoked, int alreadyEnded, boolean currentRevoked) {}

	private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repositories;
	private final AuditPublisher audit;
	private final TraceContext trace;
	private final Clock clock;
	private final IdentityAccessProperties properties;

	public ActiveSessionService(
		ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repositories,
		AuditPublisher audit,
		TraceContext trace,
		Clock clock,
		IdentityAccessProperties properties
	) {
		this.repositories = repositories;
		this.audit = audit;
		this.trace = trace;
		this.clock = clock;
		this.properties = properties;
	}

	private FindByIndexNameSessionRepository<? extends Session> repository() {
		var repository = repositories.getIfAvailable();
		if (repository == null) throw new DataAccessResourceFailureException(
			"O armazenamento de sessões não está disponível."
		);
		return repository;
	}

	public List<SessionView> sessions(String subject, String currentId) {
		return overview(subject, currentId).items();
	}

	public SessionOverview overview(String subject, String currentId) {
		requireSubject(subject);
		Instant now = clock.instant();
		var items = repository()
			.findByPrincipalName(subject).values().stream()
			.filter(session -> !session.isExpired() && absoluteExpiry(session).isAfter(now))
			.map(session -> view(session, subject, currentId, now))
			.sorted(Comparator.comparing(SessionView::lastAccessedAt).reversed()).toList();
		return new SessionOverview(subject, now, items);
	}

	private SessionView view(Session session, String subject, String currentId, Instant now) {
		boolean current = session.getId().equals(currentId);
		Instant lastAccess = current ? now : session.getLastAccessedTime();
		Instant absolute = absoluteExpiry(session);
		Instant idle = session.getMaxInactiveInterval().isNegative() || session.getMaxInactiveInterval().isZero()
			? null : lastAccess.plus(session.getMaxInactiveInterval());
		Instant expires = idle == null || absolute.isBefore(idle) ? absolute : idle;
		var client = SessionClientDetails.from(session);
		return new SessionView(reference(session.getId()), subject, session.getCreationTime(), lastAccess,
			expires, current, idle, absolute, client.browser(), client.operatingSystem(), client.device(), client.providerId());
	}

	private Instant absoluteExpiry(Session session) {
		return session.getCreationTime().plus(properties.session().maximumLifetime());
	}

	public RevocationResult revokeSelected(String subject, Set<String> references, String currentId,
		String actor, RevocationReason reason) {
		requireSubject(subject);
		if (reason == null || references == null || references.isEmpty() || references.size() > 100
			|| references.stream().anyMatch(value -> value == null || !value.matches("[a-f0-9]{64}"))) {
			throw new IllegalArgumentException("Selecione de 1 a 100 sessões e informe o motivo do encerramento.");
		}
		var repository = repository();
		var matching = repository.findByPrincipalName(subject).values().stream()
			.filter(session -> references.contains(reference(session.getId()))).toList();
		boolean currentRevoked = false;
		for (var session : matching) {
			repository.deleteById(session.getId());
			publishRevocation(subject, session.getId(), actor, reason);
			currentRevoked |= session.getId().equals(currentId);
		}
		return new RevocationResult(matching.size(), references.size() - matching.size(), currentRevoked);
	}

	private void publishRevocation(String subject, String id, String actor, RevocationReason reason) {
		audit.publish(new AuditEvent(UUID.randomUUID(), clock.instant(), "session.revoked", actor, subject,
			null, "SUCCESS", trace.currentTraceId(), "reference=" + reference(id) + "; reason=" + reason));
	}

	private static void requireSubject(String subject) {
		if (subject == null || subject.isBlank() || subject.length() > 64)
			throw new IllegalArgumentException("Informe um usuário válido para consultar as sessões.");
	}

	public boolean revoke(String subject, String reference, String currentId, String actor) {
		requireSubject(subject);
		var repository = repository();
		var session = repository
			.findByPrincipalName(subject)
			.values()
			.stream()
			.filter(candidate -> reference(candidate.getId()).equals(reference))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada ou já encerrada."));
		repository.deleteById(session.getId());
		publishRevocation(subject, session.getId(), actor, RevocationReason.ADMINISTRATIVE);
		return session.getId().equals(currentId);
	}

	public void revokeAll(String subject) {
		var repository = repository();
		repository
			.findByPrincipalName(subject)
			.keySet()
			.forEach(repository::deleteById);
	}

	private static String reference(String id) {
		try {
			return HexFormat.of().formatHex(
				MessageDigest.getInstance("SHA-256").digest(id.getBytes(StandardCharsets.UTF_8))
			);
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException(exception);
		}
	}
}
