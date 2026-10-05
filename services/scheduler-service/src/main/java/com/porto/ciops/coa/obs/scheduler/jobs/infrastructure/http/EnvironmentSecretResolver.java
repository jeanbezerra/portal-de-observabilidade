package com.porto.ciops.coa.obs.scheduler.jobs.infrastructure.http;

import org.springframework.stereotype.Component;

@Component
public class EnvironmentSecretResolver {

	public String resolve(String reference) {
		if (reference == null || !reference.startsWith("env:")) {
			throw new IllegalArgumentException("A referência de segredo deve usar o formato env:NOME_DA_VARIAVEL.");
		}
		String variable = reference.substring("env:".length());
		String value = System.getenv(variable);
		if (value == null) {
			throw new IllegalStateException("O segredo " + reference + " não está disponível no ambiente de execução.");
		}
		return value;
	}
}
