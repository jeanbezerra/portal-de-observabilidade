package com.porto.ciops.coa.obs.scheduler.jobs.application;

import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobActionResponse;
import com.porto.ciops.coa.obs.scheduler.jobs.application.model.BulkJobKeyRequest;
import com.porto.ciops.coa.obs.scheduler.support.ApplicationProblemException;
import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import org.quartz.SchedulerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class SchedulerBulkJobActionService {

	private static final Set<String> SUPPORTED_ACTIONS = Set.of("pause", "trigger", "interrupt");
	private static final Logger LOGGER = LoggerFactory.getLogger(SchedulerBulkJobActionService.class);

	private final SchedulerJobService jobs;

	public SchedulerBulkJobActionService(SchedulerJobService jobs) {
		this.jobs = jobs;
	}

	public BulkJobActionResponse execute(@Valid Collection<BulkJobKeyRequest> jobKeys, String action) {
		if (!SUPPORTED_ACTIONS.contains(action)) {
			throw ApplicationProblemException.invalidInput("Ação em lote inválida",
					"Use pause, trigger ou interrupt.");
		}

		int succeeded = 0;
		List<String> skipped = new ArrayList<>(jobKeys.size());
		for (BulkJobKeyRequest jobKey : jobKeys) {
			try {
				executeOne(jobKey, action);
				succeeded++;
			}
			catch (RuntimeException | SchedulerException exception) {
				LOGGER.warn("Uma ação em lote falhou para um job e foi registrada como ignorada.", exception);
				skipped.add(jobKey.group() + "." + jobKey.name());
			}
		}
		return new BulkJobActionResponse(jobKeys.size(), succeeded, skipped);
	}

	private void executeOne(BulkJobKeyRequest jobKey, String action) throws SchedulerException {
		switch (action) {
			case "pause" -> jobs.pauseJob(jobKey.group(), jobKey.name());
			case "trigger" -> jobs.triggerJob(jobKey.group(), jobKey.name());
			case "interrupt" -> jobs.interruptJob(jobKey.group(), jobKey.name());
			case null, default -> throw new IllegalStateException("Ação em lote não suportada: " + action);
		}
	}
}
