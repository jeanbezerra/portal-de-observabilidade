package com.porto.ciops.coa.obs.scheduler.administration.application.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CalendarEntryRequest(
		@Size(max = 80) String id,
		@NotBlank @Size(max = 120) String name,
		@NotNull LocalDate date,
		@NotBlank @Pattern(regexp = "Feriado|Data comemorativa|Ponto facultativo|Data institucional") String type,
		@NotBlank @Pattern(regexp = "Nacional|Estadual|Municipal|Corporativa") String scope,
		@NotNull @Size(max = 120) String location,
		@NotNull @Size(max = 500) String notes) {
}
