package com.safebus.notification.config;

import com.safebus.common.config.BaseOpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration("notificationOpenApiConfig")
public class OpenApiConfig extends BaseOpenApiConfig {

    @Value("${server.url:http://localhost:${server.port:8085}}")
    private String localUrl;

    @Value("${gateway.url:http://localhost:8080}")
    private String gatewayUrl;

    @Bean
    @ConditionalOnMissingBean
    public OpenAPI customOpenAPI() {
        return createOpenAPI(
                "SafeBus AI Notification Service API",
                "API Documentation for notifications history queries, WebSocket alert mappings, and direct trigger hooks",
                "1.0.0",
                gatewayUrl,
                localUrl
        );
    }
}
