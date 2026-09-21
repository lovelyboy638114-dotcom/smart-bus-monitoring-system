package com.safebus.attendance.config;

import com.safebus.common.config.BaseOpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration("attendanceOpenApiConfig")
public class OpenApiConfig extends BaseOpenApiConfig {

    @Value("${server.url:http://localhost:${server.port:8084}}")
    private String localUrl;

    @Value("${gateway.url:http://localhost:8080}")
    private String gatewayUrl;

    @Bean
    @ConditionalOnMissingBean
    public OpenAPI customOpenAPI() {
        return createOpenAPI(
                "SafeBus AI Attendance Service API",
                "API Documentation for passenger boarding scanning check-ins, scans validation, and logging updates",
                "1.0.0",
                gatewayUrl,
                localUrl
        );
    }
}
