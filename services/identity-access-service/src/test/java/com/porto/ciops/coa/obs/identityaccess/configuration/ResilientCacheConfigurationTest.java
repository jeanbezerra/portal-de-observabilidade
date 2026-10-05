package com.porto.ciops.coa.obs.identityaccess.configuration;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

class ResilientCacheConfigurationTest {

	@Test
	void toleratesEveryCacheOperationFailure() {
		Cache cache = mock(Cache.class);
		when(cache.getName()).thenReturn("provider-discovery");
		CacheErrorHandler handler = new ResilientCacheConfiguration().errorHandler();
		RuntimeException failure = new IllegalStateException("redis offline");

		assertThatCode(() -> {
			handler.handleCacheGetError(failure, cache, "key");
			handler.handleCachePutError(failure, cache, "key", "value");
			handler.handleCacheEvictError(failure, cache, "key");
			handler.handleCacheClearError(failure, cache);
		}).doesNotThrowAnyException();
	}
}
