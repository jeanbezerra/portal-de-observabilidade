package com.porto.ciops.coa.obs.identityaccess.administration.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditEvent;
import com.porto.ciops.coa.obs.identityaccess.audit.domain.AuditPublisher;
import com.porto.ciops.coa.obs.identityaccess.configuration.IdentityAccessProperties;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;

class ActiveSessionServiceTest {

	private final Instant now = Instant.parse("2026-10-17T12:00:00Z");
	private final Map<String, Session> stored = new HashMap<>();
	private final AuditPublisher audit = mock(AuditPublisher.class);
	private final FindByIndexNameSessionRepository<Session> repository;
	private final ActiveSessionService service;

	@SuppressWarnings("unchecked")
	ActiveSessionServiceTest() {
		repository = mock(FindByIndexNameSessionRepository.class);
		ObjectProvider<FindByIndexNameSessionRepository<? extends Session>> provider = mock(ObjectProvider.class);
		doReturn(repository).when(provider).getIfAvailable();
		when(repository.findByPrincipalName("subject")).thenReturn(stored);
		doAnswer(call -> { stored.remove(call.getArgument(0)); return null; }).when(repository).deleteById(anyString());
		var properties = mock(IdentityAccessProperties.class, RETURNS_DEEP_STUBS);
		when(properties.session().maximumLifetime()).thenReturn(Duration.ofHours(12));
		service = new ActiveSessionService(provider, audit, () -> "test-trace", Clock.fixed(now, ZoneOffset.UTC), properties);
	}

	private void session(String id, Instant created, Instant lastAccess) {
		var session = mock(Session.class);
		when(session.getId()).thenReturn(id);
		when(session.getCreationTime()).thenReturn(created);
		when(session.getLastAccessedTime()).thenReturn(lastAccess);
		when(session.getMaxInactiveInterval()).thenReturn(Duration.ofMinutes(30));
		stored.put(id, session);
	}

	@Test void boundsExpiryByAbsoluteLifetimeAndHidesExpiredSessions() {
		session("current-secret-cookie", now.minusSeconds(43100), now.minusSeconds(60));
		session("absolute-expired", now.minusSeconds(43201), now.minusSeconds(10));
		session("idle-expired", now.minusSeconds(60), now.minusSeconds(30));
		when(stored.get("idle-expired").isExpired()).thenReturn(true);
		var result = service.overview("subject", "current-secret-cookie");
		assertThat(result.checkedAt()).isEqualTo(now);
		assertThat(result.items()).hasSize(1);
		var item = result.items().getFirst();
		assertThat(item.reference()).matches("[a-f0-9]{64}").doesNotContain("secret-cookie");
		assertThat(item.current()).isTrue();
		assertThat(item.lastAccessedAt()).isEqualTo(now);
		assertThat(item.idleExpiresAt()).isEqualTo(now.plusSeconds(1800));
		assertThat(item.expiresAt()).isEqualTo(now.plusSeconds(100));
		assertThat(item.browser()).isNull(); // Legacy session, no invented device.
	}

	@Test void revokesOnlySelectedSubjectsSessionsAndAuditsPublicReferenceAndReason() {
		session("keep", now.minusSeconds(90), now.minusSeconds(10));
		session("remove", now.minusSeconds(90), now.minusSeconds(20));
		String reference = service.sessions("subject", "remove").stream().filter(ActiveSessionService.SessionView::current).findFirst().orElseThrow().reference();
		var result = service.revokeSelected("subject", Set.of(reference, "0".repeat(64)), "remove", "admin", ActiveSessionService.RevocationReason.SUSPICIOUS_ACTIVITY);
		assertThat(result).isEqualTo(new ActiveSessionService.RevocationResult(1, 1, true));
		assertThat(stored.keySet()).containsExactly("keep");
		var event = ArgumentCaptor.forClass(AuditEvent.class);
		verify(audit).publish(event.capture());
		assertThat(event.getValue().target()).isEqualTo("subject");
		assertThat(event.getValue().sourceContext()).contains(reference, "SUSPICIOUS_ACTIVITY").doesNotContain("remove");
		assertThat(service.revokeSelected("subject", Set.of(reference), "remove", "admin", ActiveSessionService.RevocationReason.USER_REQUEST).alreadyEnded()).isEqualTo(1);
	}

	@Test void rejectsInvalidBulkCommandsBeforeDeletingAnything() {
		assertThatThrownBy(() -> service.revokeSelected("subject", Set.of(), null, "admin", ActiveSessionService.RevocationReason.ADMINISTRATIVE)).isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> service.revokeSelected("subject", Set.of("raw-session-id"), null, "admin", ActiveSessionService.RevocationReason.ADMINISTRATIVE)).isInstanceOf(IllegalArgumentException.class);
		var tooMany = new HashSet<String>();
		for (int i = 0; i < 101; i++) tooMany.add(String.format("%064x", i));
		assertThatThrownBy(() -> service.revokeSelected("subject", tooMany, null, "admin", ActiveSessionService.RevocationReason.ADMINISTRATIVE)).isInstanceOf(IllegalArgumentException.class);
		verify(repository, never()).deleteById(anyString());
		verifyNoInteractions(audit);
	}
}
