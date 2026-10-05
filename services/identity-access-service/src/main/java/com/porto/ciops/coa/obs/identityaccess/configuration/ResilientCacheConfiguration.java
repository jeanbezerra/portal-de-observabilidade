package com.porto.ciops.coa.obs.identityaccess.configuration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class ResilientCacheConfiguration implements CachingConfigurer {

	private static final Logger LOGGER = LoggerFactory.getLogger(ResilientCacheConfiguration.class);

	@Override
	public CacheErrorHandler errorHandler() {
		return new CacheErrorHandler() {
			@Override
			public void handleCacheGetError(RuntimeException exception, Cache cache, Object key) {
				warn(cache, "read", exception);
			}

			@Override
			public void handleCachePutError(RuntimeException exception, Cache cache, Object key, Object value) {
				warn(cache, "write", exception);
			}

			@Override
			public void handleCacheEvictError(RuntimeException exception, Cache cache, Object key) {
				warn(cache, "evict", exception);
			}

			@Override
			public void handleCacheClearError(RuntimeException exception, Cache cache) {
				warn(cache, "clear", exception);
			}
		};
	}

	private static void warn(Cache cache, String operation, RuntimeException exception) {
		if (LOGGER.isWarnEnabled()) {
			LOGGER.warn("Cache {} failed; continuing against the authoritative store: cache={}, error={}",
					operation, cache.getName(), exception.getClass().getSimpleName());
		}
	}
}
