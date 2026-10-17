package com.porto.ciops.coa.obs.identityaccess.administration.application;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.TraceContext;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
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
		boolean current
	) {}

	private final ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repositories;
	private final AuditPublisher audit;
	private final TraceContext trace;
	private final Clock clock;

	public ActiveSessionService(
		ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> repositories,
		AuditPublisher audit,
		TraceContext trace,
		Clock clock
	) {
		this.repositories = repositories;
		this.audit = audit;
		this.trace = trace;
		this.clock = clock;
	}

	private FindByIndexNameSessionRepository<? extends Session> repository() {
		var repository = repositories.getIfAvailable();
		if (repository == null) throw new DataAccessResourceFailureException(
			"O armazenamento de sessões não está disponível."
		);
		return repository;
	}

	public List<SessionView> sessions(String subject, String currentId) {
		return repository()
			.findByPrincipalName(subject)
			.values()
			.stream()
			.filter(session -> !session.isExpired())
			.map(session ->
				new SessionView(
					reference(session.getId()),
					subject,
					session.getCreationTime(),
					session.getLastAccessedTime(),
					session.getLastAccessedTime().plus(session.getMaxInactiveInterval()),
					session.getId().equals(currentId)
				)
			)
			.sorted(Comparator.comparing(SessionView::lastAccessedAt).reversed())
			.toList();
	}

	public boolean revoke(String subject, String reference, String currentId, String actor) {
		var repository = repository();
		var session = repository
			.findByPrincipalName(subject)
			.values()
			.stream()
			.filter(candidate -> reference(candidate.getId()).equals(reference))
			.findFirst()
			.orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada ou já encerrada."));
		repository.deleteById(session.getId());
		audit.publish(
			AuditEvent.success(
				clock.instant(),
				"session.revoked",
				actor,
				subject,
				null,
				trace.currentTraceId()
			)
		);
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
