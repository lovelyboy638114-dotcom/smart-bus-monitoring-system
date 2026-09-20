package com.safebus.student.config;

import com.safebus.common.config.BaseOpenApiConfig;
import io.swagger.v3.oas.models.OpenAPI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig extends BaseOpenApiConfig {

    @Value("${server.url:http://localhost:${server.port:8082}}")
    private String localUrl;

    @Value("${gateway.url:http://localhost:8080}")
    private String gatewayUrl;

    @Bean
    public OpenAPI customOpenAPI() {
        return createOpenAPI(
                "SafeBus AI Student Service API",
                "API Documentation for Student Registration, Parents, SOS, Analytics, and ID Card operations",
                "1.0.0",
                gatewayUrl,
                localUrl
        );
    }
}
