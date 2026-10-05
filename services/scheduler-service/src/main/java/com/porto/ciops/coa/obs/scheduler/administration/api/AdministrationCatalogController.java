package com.porto.ciops.coa.obs.scheduler.administration.api;

import com.porto.ciops.coa.obs.scheduler.administration.application.AdministrationCatalogService;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.CalendarEntryRequest;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.CalendarEntryResponse;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.JobGroupRequest;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.JobGroupResponse;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.JobTypeResponse;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.TimeZoneRequest;
import com.porto.ciops.coa.obs.scheduler.administration.application.model.TimeZoneResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Cadastros do scheduler", description = "Calendários, fusos horários, grupos e tipos de rotina")
public class AdministrationCatalogController {

	private final AdministrationCatalogService service;

	public AdministrationCatalogController(AdministrationCatalogService service) {
		this.service = service;
	}

	@GetMapping("/calendars")
	@Operation(summary = "Listar datas do calendário corporativo")
	List<CalendarEntryResponse> listCalendarEntries() {
		return service.listCalendarEntries();
	}

	@PostMapping("/calendars")
	@Operation(summary = "Cadastrar uma data no calendário corporativo")
	ResponseEntity<CalendarEntryResponse> createCalendarEntry(@Valid @RequestBody CalendarEntryRequest request) {
		CalendarEntryResponse created = service.createCalendarEntry(request);
		return ResponseEntity.created(URI.create("/api/v1/calendars/" + created.id())).body(created);
	}

	@PutMapping("/calendars/{id}")
	@Operation(summary = "Atualizar uma data do calendário corporativo")
	CalendarEntryResponse updateCalendarEntry(@PathVariable String id, @Valid @RequestBody CalendarEntryRequest request) {
		return service.updateCalendarEntry(id, request);
	}

	@DeleteMapping("/calendars/{id}")
	@Operation(summary = "Excluir uma data do calendário corporativo")
	ResponseEntity<Void> deleteCalendarEntry(@PathVariable String id) {
		service.deleteCalendarEntry(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/time-zones")
	@Operation(summary = "Listar fusos horários cadastrados")
	List<TimeZoneResponse> listTimeZones() {
		return service.listTimeZones();
	}

	@PostMapping("/time-zones")
	@Operation(summary = "Cadastrar um fuso horário")
	ResponseEntity<TimeZoneResponse> createTimeZone(@Valid @RequestBody TimeZoneRequest request) {
		TimeZoneResponse created = service.createTimeZone(request);
		return ResponseEntity.created(URI.create("/api/v1/time-zones/" + created.id())).body(created);
	}

	@PutMapping("/time-zones/{id}")
	@Operation(summary = "Atualizar um fuso horário")
	TimeZoneResponse updateTimeZone(@PathVariable String id, @Valid @RequestBody TimeZoneRequest request) {
		return service.updateTimeZone(id, request);
	}

	@DeleteMapping("/time-zones/{id}")
	@Operation(summary = "Excluir um fuso horário")
	ResponseEntity<Void> deleteTimeZone(@PathVariable String id) {
		service.deleteTimeZone(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/job-groups")
	@Operation(summary = "Listar grupos de rotinas")
	List<JobGroupResponse> listJobGroups() {
		return service.listJobGroups();
	}

	@PostMapping("/job-groups")
	@Operation(summary = "Cadastrar um grupo de rotinas")
	ResponseEntity<JobGroupResponse> createJobGroup(@Valid @RequestBody JobGroupRequest request) {
		JobGroupResponse created = service.createJobGroup(request);
		return ResponseEntity.created(URI.create("/api/v1/job-groups/" + created.id())).body(created);
	}

	@PutMapping("/job-groups/{id}")
	@Operation(summary = "Atualizar um grupo de rotinas")
	JobGroupResponse updateJobGroup(@PathVariable String id, @Valid @RequestBody JobGroupRequest request) {
		return service.updateJobGroup(id, request);
	}

	@DeleteMapping("/job-groups/{id}")
	@Operation(summary = "Excluir um grupo de rotinas")
	ResponseEntity<Void> deleteJobGroup(@PathVariable String id) {
		service.deleteJobGroup(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/job-types")
	@Operation(summary = "Listar os tipos de rotina disponíveis no portal")
	List<JobTypeResponse> listJobTypes() {
		return service.listJobTypes();
	}
}
