package com.porto.ciops.coa.obs.identityaccess.configuration;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class CoreConfiguration {

	@Bean
	Clock systemClock() {
		return Clock.systemUTC();
	}
}
