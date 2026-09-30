package com.porto.ciops.coa.scheduler.api.administration.application;

import com.porto.ciops.coa.scheduler.api.administration.application.model.CalendarEntryRequest;
import com.porto.ciops.coa.scheduler.api.administration.application.model.CalendarEntryResponse;
import com.porto.ciops.coa.scheduler.api.administration.application.model.JobGroupRequest;
import com.porto.ciops.coa.scheduler.api.administration.application.model.JobGroupResponse;
import com.porto.ciops.coa.scheduler.api.administration.application.model.JobTypeResponse;
import com.porto.ciops.coa.scheduler.api.administration.application.model.TimeZoneRequest;
import com.porto.ciops.coa.scheduler.api.administration.application.model.TimeZoneResponse;
import com.porto.ciops.coa.scheduler.api.support.ApplicationProblemException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.time.zone.ZoneRulesException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.impl.calendar.HolidayCalendar;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdministrationCatalogService {

	public static final String MANAGED_HOLIDAY_CALENDAR_DESCRIPTION =
			"Calendário de feriados gerenciado pela Scheduler API";

	private static final Logger LOGGER = LoggerFactory.getLogger(AdministrationCatalogService.class);

	private final JdbcTemplate jdbc;
	private final Scheduler scheduler;

	public AdministrationCatalogService(JdbcTemplate jdbc, Scheduler scheduler) {
		this.jdbc = jdbc;
		this.scheduler = scheduler;
	}

	public List<CalendarEntryResponse> listCalendarEntries() {
		return jdbc.query("""
				SELECT id, name, calendar_date, entry_type, scope, location, notes, created_at, updated_at
				FROM public.scheduler_calendar_entry
				ORDER BY calendar_date, name, id
				""", AdministrationCatalogService::mapCalendarEntry);
	}

	public CalendarEntryResponse createCalendarEntry(CalendarEntryRequest request) {
		validateCalendarLocation(request.scope(), request.location());
		Instant now = Instant.now();
		String id = normalizeRequestedId(request.id(), "CAL-");

		try {
			jdbc.update("""
					INSERT INTO public.scheduler_calendar_entry (
					    id, name, normalized_name, calendar_date, entry_type, scope,
					    location, normalized_location, notes, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					""",
					id, trim(request.name()), normalize(request.name()), request.date(), request.type(), request.scope(),
					trim(request.location()), normalize(request.location()), trim(request.notes()), timestamp(now), timestamp(now));
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Data duplicada", "Já existe uma data idêntica cadastrada para essa localidade.");
		}

		CalendarEntryResponse created = findCalendarEntry(id);
		refreshQuartzCalendars();
		return created;
	}

	public CalendarEntryResponse updateCalendarEntry(String id, CalendarEntryRequest request) {
		validateCalendarLocation(request.scope(), request.location());
		try {
			int updated = jdbc.update("""
					UPDATE public.scheduler_calendar_entry
					SET name = ?, normalized_name = ?, calendar_date = ?, entry_type = ?, scope = ?,
					    location = ?, normalized_location = ?, notes = ?, updated_at = ?
					WHERE id = ?
					""",
					trim(request.name()), normalize(request.name()), request.date(), request.type(), request.scope(),
					trim(request.location()), normalize(request.location()), trim(request.notes()), timestamp(Instant.now()), id);
			if (updated == 0) {
				throw notFound("Data não encontrada", "A data solicitada não existe no calendário.");
			}
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Data duplicada", "Já existe uma data idêntica cadastrada para essa localidade.");
		}
		CalendarEntryResponse updatedEntry = findCalendarEntry(id);
		refreshQuartzCalendars();
		return updatedEntry;
	}

	public void deleteCalendarEntry(String id) {
		if (jdbc.update("DELETE FROM public.scheduler_calendar_entry WHERE id = ?", id) == 0) {
			throw notFound("Data não encontrada", "A data solicitada não existe no calendário.");
		}
		refreshQuartzCalendars();
	}

	public List<TimeZoneResponse> listTimeZones() {
		return jdbc.query("""
				SELECT id, label, time_zone, description, active, is_default, created_at, updated_at
				FROM public.scheduler_time_zone
				ORDER BY is_default DESC, label, id
				""", AdministrationCatalogService::mapTimeZone);
	}

	@Transactional
	public TimeZoneResponse createTimeZone(TimeZoneRequest request) {
		String zone = validateAndCanonicalizeTimeZone(request.timeZone());
		boolean first = jdbc.queryForObject("SELECT count(*) FROM public.scheduler_time_zone", Long.class) == 0;
		boolean makeDefault = first || request.isDefault();
		boolean active = makeDefault || request.active();
		Instant now = Instant.now();
		String id = normalizeRequestedId(request.id(), "TZ-");

		if (makeDefault) {
			clearDefaultTimeZone(now);
		}

		try {
			jdbc.update("""
					INSERT INTO public.scheduler_time_zone (
					    id, label, time_zone, description, active, is_default, default_marker, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					""", id, trim(request.label()), zone, trim(request.description()), active, makeDefault,
					makeDefault ? "DEFAULT" : null, timestamp(now), timestamp(now));
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Fuso horário duplicado", "Este fuso horário já está cadastrado.");
		}
		return findTimeZone(id);
	}

	@Transactional
	public TimeZoneResponse updateTimeZone(String id, TimeZoneRequest request) {
		TimeZoneResponse current = findTimeZone(id);
		String zone = validateAndCanonicalizeTimeZone(request.timeZone());
		if (current.isDefault() && !request.isDefault()) {
			throw conflict("Fuso horário padrão", "Defina outro fuso como padrão antes de alterar este registro.");
		}
		if (request.isDefault() && !request.active()) {
			throw conflict("Fuso horário inativo", "O fuso horário padrão precisa estar ativo.");
		}
		Instant now = Instant.now();
		if (request.isDefault()) {
			clearDefaultTimeZone(now);
		}

		try {
			jdbc.update("""
					UPDATE public.scheduler_time_zone
					SET label = ?, time_zone = ?, description = ?, active = ?, is_default = ?,
					    default_marker = ?, updated_at = ?
					WHERE id = ?
					""", trim(request.label()), zone, trim(request.description()), request.active(), request.isDefault(),
					request.isDefault() ? "DEFAULT" : null, timestamp(now), id);
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Fuso horário duplicado", "Este fuso horário já está cadastrado.");
		}
		return findTimeZone(id);
	}

	@Transactional
	public void deleteTimeZone(String id) {
		TimeZoneResponse current = findTimeZone(id);
		if (current.isDefault()) {
			throw conflict("Fuso horário padrão", "Defina outro fuso como padrão antes da exclusão.");
		}
		jdbc.update("DELETE FROM public.scheduler_time_zone WHERE id = ?", id);
	}

	public List<JobGroupResponse> listJobGroups() {
		return jdbc.query("""
				SELECT g.id, g.group_key, g.name, g.description, g.active, g.created_at, g.updated_at,
				       (SELECT count(*) FROM public.qrtz_job_details q
				        WHERE q.sched_name = ? AND q.job_group = g.group_key) AS routine_count
				FROM public.scheduler_job_group g
				ORDER BY g.name, g.id
				""", AdministrationCatalogService::mapJobGroup, schedulerName());
	}

	public List<JobTypeResponse> listJobTypes() {
		return List.of(
				new JobTypeResponse("HTTP_REQUEST", "Requisição HTTP",
						"Aciona uma API interna ou externa com método, parâmetros, autenticação e corpo configuráveis.",
						"HTTP_REQUEST", true, false, true));
	}

	@Transactional
	public JobGroupResponse createJobGroup(JobGroupRequest request) {
		Instant now = Instant.now();
		String id = normalizeRequestedId(request.id(), "JOB-GROUP-");
		try {
			jdbc.update("""
					INSERT INTO public.scheduler_job_group (
					    id, group_key, name, description, active, created_at, updated_at
					) VALUES (?, ?, ?, ?, ?, ?, ?)
					""", id, normalizeKey(request.key()), trim(request.name()), trim(request.description()), request.active(),
					timestamp(now), timestamp(now));
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Grupo duplicado", "Já existe um grupo com este identificador.");
		}
		return findJobGroup(id);
	}

	@Transactional
	public JobGroupResponse updateJobGroup(String id, JobGroupRequest request) {
		JobGroupResponse current = findJobGroup(id);
		String requestedKey = normalizeKey(request.key());
		if (!current.key().equals(requestedKey) && current.routineCount() > 0) {
			throw conflict("Grupo em uso", "O identificador não pode ser alterado enquanto houver rotinas vinculadas.");
		}
		try {
			jdbc.update("""
					UPDATE public.scheduler_job_group
					SET group_key = ?, name = ?, description = ?, active = ?, updated_at = ?
					WHERE id = ?
					""", requestedKey, trim(request.name()), trim(request.description()), request.active(),
					timestamp(Instant.now()), id);
		}
		catch (DuplicateKeyException exception) {
			throw conflict("Grupo duplicado", "Já existe um grupo com este identificador.");
		}
		return findJobGroup(id);
	}

	@Transactional
	public void deleteJobGroup(String id) {
		JobGroupResponse current = findJobGroup(id);
		if (current.routineCount() > 0) {
			throw conflict("Grupo em uso", "Remova ou transfira as rotinas vinculadas antes de excluir o grupo.");
		}
		jdbc.update("DELETE FROM public.scheduler_job_group WHERE id = ?", id);
	}

	public boolean activeJobGroupExists(String groupKey) {
		Long count = jdbc.queryForObject(
				"SELECT count(*) FROM public.scheduler_job_group WHERE group_key = ? AND active = true",
				Long.class, groupKey);
		return count != null && count > 0;
	}

	public List<java.time.LocalDate> holidayDates() {
		return jdbc.queryForList("""
				SELECT calendar_date FROM public.scheduler_calendar_entry
				WHERE entry_type = 'Feriado'
				ORDER BY calendar_date
				""", java.time.LocalDate.class);
	}

	private void refreshQuartzCalendars() {
		try {
			for (String calendarName : scheduler.getCalendarNames()) {
				if (!(scheduler.getCalendar(calendarName) instanceof HolidayCalendar current)
						|| !MANAGED_HOLIDAY_CALENDAR_DESCRIPTION.equals(current.getDescription())) continue;
				HolidayCalendar calendar = new HolidayCalendar();
				calendar.setDescription(MANAGED_HOLIDAY_CALENDAR_DESCRIPTION);
				for (java.time.LocalDate date : holidayDates()) {
					calendar.addExcludedDate(java.util.Date.from(
							date.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant()));
				}
				scheduler.addCalendar(calendarName, calendar, true, true);
			}
		}
		catch (SchedulerException exception) {
			LOGGER.warn("Os dados foram salvos, mas os calendários gerenciados do Quartz não puderam ser atualizados.",
					exception);
		}
	}

	private CalendarEntryResponse findCalendarEntry(String id) {
		List<CalendarEntryResponse> entries = jdbc.query("""
				SELECT id, name, calendar_date, entry_type, scope, location, notes, created_at, updated_at
				FROM public.scheduler_calendar_entry WHERE id = ?
				""", AdministrationCatalogService::mapCalendarEntry, id);
		if (entries.isEmpty()) {
			throw notFound("Data não encontrada", "A data solicitada não existe no calendário.");
		}
		return entries.getFirst();
	}

	private TimeZoneResponse findTimeZone(String id) {
		List<TimeZoneResponse> entries = jdbc.query("""
				SELECT id, label, time_zone, description, active, is_default, created_at, updated_at
				FROM public.scheduler_time_zone WHERE id = ?
				""", AdministrationCatalogService::mapTimeZone, id);
		if (entries.isEmpty()) {
			throw notFound("Fuso horário não encontrado", "O fuso horário solicitado não existe.");
		}
		return entries.getFirst();
	}

	private JobGroupResponse findJobGroup(String id) {
		List<JobGroupResponse> groups = jdbc.query("""
				SELECT g.id, g.group_key, g.name, g.description, g.active, g.created_at, g.updated_at,
				       (SELECT count(*) FROM public.qrtz_job_details q
				        WHERE q.sched_name = ? AND q.job_group = g.group_key) AS routine_count
				FROM public.scheduler_job_group g WHERE g.id = ?
				""", AdministrationCatalogService::mapJobGroup, schedulerName(), id);
		if (groups.isEmpty()) {
			throw notFound("Grupo não encontrado", "O grupo de rotinas solicitado não existe.");
		}
		return groups.getFirst();
	}

	private void clearDefaultTimeZone(Instant now) {
		jdbc.update("""
				UPDATE public.scheduler_time_zone
				SET is_default = false, default_marker = NULL, updated_at = ?
				WHERE is_default = true
				""", timestamp(now));
	}

	private String schedulerName() {
		try {
			return scheduler.getSchedulerName();
		}
		catch (SchedulerException exception) {
			throw new IllegalStateException("Não foi possível consultar o nome do scheduler.", exception);
		}
	}

	private static CalendarEntryResponse mapCalendarEntry(ResultSet resultSet, int rowNumber) throws SQLException {
		return new CalendarEntryResponse(
				resultSet.getString("id"), resultSet.getString("name"), resultSet.getObject("calendar_date", java.time.LocalDate.class),
				resultSet.getString("entry_type"), resultSet.getString("scope"), resultSet.getString("location"),
				resultSet.getString("notes"), instant(resultSet, "created_at"), instant(resultSet, "updated_at"));
	}

	private static TimeZoneResponse mapTimeZone(ResultSet resultSet, int rowNumber) throws SQLException {
		return new TimeZoneResponse(
				resultSet.getString("id"), resultSet.getString("label"), resultSet.getString("time_zone"),
				resultSet.getString("description"), resultSet.getBoolean("active"), resultSet.getBoolean("is_default"),
				instant(resultSet, "created_at"), instant(resultSet, "updated_at"));
	}

	private static JobGroupResponse mapJobGroup(ResultSet resultSet, int rowNumber) throws SQLException {
		return new JobGroupResponse(
				resultSet.getString("id"), resultSet.getString("group_key"), resultSet.getString("name"),
				resultSet.getString("description"), resultSet.getBoolean("active"), resultSet.getLong("routine_count"),
				instant(resultSet, "created_at"), instant(resultSet, "updated_at"));
	}

	private static Instant instant(ResultSet resultSet, String column) throws SQLException {
		Timestamp value = resultSet.getTimestamp(column);
		return value == null ? null : value.toInstant();
	}

	private static Timestamp timestamp(Instant value) {
		return Timestamp.from(value);
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}

	private static String normalize(String value) {
		return trim(value).toLowerCase(Locale.forLanguageTag("pt-BR"));
	}

	private static String normalizeKey(String value) {
		return normalize(value);
	}

	private static String normalizeRequestedId(String id, String prefix) {
		return id == null || id.isBlank() ? prefix + UUID.randomUUID() : id.trim();
	}

	private static void validateCalendarLocation(String scope, String location) {
		if (("Estadual".equals(scope) || "Municipal".equals(scope)) && trim(location).isEmpty()) {
			throw ApplicationProblemException.invalidInput("Localidade obrigatória",
					"Informe a localidade para datas estaduais ou municipais.");
		}
	}

	private static String validateAndCanonicalizeTimeZone(String value) {
		try {
			return ZoneId.of(trim(value)).getId();
		}
		catch (ZoneRulesException exception) {
			throw ApplicationProblemException.invalidInput("Fuso horário inválido",
					"Informe um identificador IANA de fuso horário válido.");
		}
	}

	private static ApplicationProblemException conflict(String title, String detail) {
		return ApplicationProblemException.conflict(title, detail);
	}

	private static ApplicationProblemException notFound(String title, String detail) {
		return ApplicationProblemException.notFound(title, detail);
	}
}
