package com.safebus.transport.config;

import com.safebus.common.config.BaseOpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig extends BaseOpenApiConfig {

    @Value("${server.url:http://localhost:${server.port:8083}}")
    private String localUrl;

    @Value("${gateway.url:http://localhost:8080}")
    private String gatewayUrl;

    @Bean
    public OpenAPI customOpenAPI() {
        return createOpenAPI(
                "SafeBus AI Transport Service API",
                "API Documentation for Bus routes tracking, live telemetry, drivers profiling, and incidents logs",
                "1.0.0",
                gatewayUrl,
                localUrl
        );
    }
}
