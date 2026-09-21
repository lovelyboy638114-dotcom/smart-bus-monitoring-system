package com.safebus.gateway.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

@RestController
public class MergedOpenApiController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    private static final Map<String, String> SERVICE_URLS = new LinkedHashMap<>();
    static {
        SERVICE_URLS.put("Auth Service", System.getenv().getOrDefault("AUTH_SERVICE_URL", "http://localhost:8081") + "/v3/api-docs");
        SERVICE_URLS.put("Student Service", System.getenv().getOrDefault("STUDENT_SERVICE_URL", "http://localhost:8082") + "/v3/api-docs");
        SERVICE_URLS.put("Transport Service", System.getenv().getOrDefault("TRANSPORT_SERVICE_URL", "http://localhost:8083") + "/v3/api-docs");
        SERVICE_URLS.put("Attendance Service", System.getenv().getOrDefault("ATTENDANCE_SERVICE_URL", "http://localhost:8084") + "/v3/api-docs");
        SERVICE_URLS.put("Notification Service", System.getenv().getOrDefault("NOTIFICATION_SERVICE_URL", "http://localhost:8086") + "/v3/api-docs");
    }

    @GetMapping(value = {"/", "/index.html"})
    public Mono<Void> rootRedirect(ServerHttpResponse response) {
        String frontendUrl = System.getenv().getOrDefault("RAILWAY_SERVICE_SAFEBUS_FRONTEND_URL", "safebus-frontend-production.up.railway.app");
        if (!frontendUrl.startsWith("http://") && !frontendUrl.startsWith("https://")) {
            frontendUrl = "https://" + frontendUrl;
        }
        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create(frontendUrl));
        return response.setComplete();
    }

    @GetMapping(value = "/health", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> healthCheck() {
        Map<String, Object> health = new LinkedHashMap<>();
        health.put("status", "UP");
        health.put("gateway", "SafeBus Cloud Gateway");
        health.put("frontend", "https://safebus-frontend-production.up.railway.app");
        return Mono.just(health);
    }

    @GetMapping(value = {"/swagger", "/docs", "/api-docs"})
    public Mono<Void> redirectToUnifiedSwagger(ServerHttpResponse response) {
        response.setStatusCode(HttpStatus.FOUND);
        response.getHeaders().setLocation(URI.create("/swagger-ui/index.html?url=/v3/api-docs/all"));
        return response.setComplete();
    }

    @GetMapping(value = {"/v3/api-docs/all", "/v3/api-docs/merged"}, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> getMergedOpenApiDocs() {
        return Mono.fromCallable(this::buildMergedSpec);
    }

    private Map<String, Object> buildMergedSpec() {
        Map<String, Object> merged = new LinkedHashMap<>();
        merged.put("openapi", "3.0.1");

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("title", "SafeBus Shield — Unified Microservices API");
        info.put("description", "Complete interactive API console aggregating all 5 microservices (Auth, Student, Transport, Attendance, and Notification) under a single gateway endpoint.");
        info.put("version", "1.0.0");
        merged.put("info", info);

        String gatewayHost = System.getenv().getOrDefault("GATEWAY_PUBLIC_URL", "/");
        List<Map<String, Object>> servers = new ArrayList<>();
        servers.add(Map.of("url", gatewayHost, "description", "SafeBus AI API Gateway (Unified Host)"));
        merged.put("servers", servers);

        Map<String, Object> allPaths = new LinkedHashMap<>();
        Map<String, Object> allSchemas = new LinkedHashMap<>();
        Map<String, Object> allSecuritySchemes = new LinkedHashMap<>();
        List<Map<String, Object>> allTags = new ArrayList<>();
        Set<String> seenTagNames = new HashSet<>();

        for (Map.Entry<String, String> entry : SERVICE_URLS.entrySet()) {
            String serviceName = entry.getKey();
            String url = entry.getValue();

            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(Duration.ofSeconds(4))
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200 && response.body() != null) {
                    Map<String, Object> spec = objectMapper.readValue(response.body(), new TypeReference<>() {});

                    // Merge Paths
                    Object pathsObj = spec.get("paths");
                    if (pathsObj instanceof Map<?, ?> pathsMap) {
                        for (Map.Entry<?, ?> pEntry : pathsMap.entrySet()) {
                            allPaths.put(String.valueOf(pEntry.getKey()), pEntry.getValue());
                        }
                    }

                    // Merge Components
                    Object compObj = spec.get("components");
                    if (compObj instanceof Map<?, ?> compMap) {
                        Object schemasObj = compMap.get("schemas");
                        if (schemasObj instanceof Map<?, ?> schemasMap) {
                            for (Map.Entry<?, ?> sEntry : schemasMap.entrySet()) {
                                allSchemas.put(String.valueOf(sEntry.getKey()), sEntry.getValue());
                            }
                        }

                        Object secObj = compMap.get("securitySchemes");
                        if (secObj instanceof Map<?, ?> secMap) {
                            for (Map.Entry<?, ?> secEntry : secMap.entrySet()) {
                                allSecuritySchemes.put(String.valueOf(secEntry.getKey()), secEntry.getValue());
                            }
                        }
                    }

                    // Merge Tags
                    Object tagsObj = spec.get("tags");
                    if (tagsObj instanceof List<?> tagsList) {
                        for (Object t : tagsList) {
                            if (t instanceof Map<?, ?> tMap) {
                                String tagName = (String) tMap.get("name");
                                if (tagName != null && seenTagNames.add(tagName)) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> casted = (Map<String, Object>) tMap;
                                    allTags.add(casted);
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("[MergedOpenApiController] Warning: Could not fetch spec for " + serviceName + " at " + url + ": " + e.getMessage());
            }
        }

        merged.put("paths", allPaths);

        Map<String, Object> components = new LinkedHashMap<>();
        components.put("schemas", allSchemas);
        if (!allSecuritySchemes.isEmpty()) {
            components.put("securitySchemes", allSecuritySchemes);
        }
        merged.put("components", components);

        if (!allSecuritySchemes.isEmpty()) {
            List<Map<String, List<String>>> security = new ArrayList<>();
            Map<String, List<String>> bearer = new LinkedHashMap<>();
            bearer.put("Bearer Authentication", Collections.emptyList());
            security.add(bearer);
            merged.put("security", security);
        }

        if (!allTags.isEmpty()) {
            merged.put("tags", allTags);
        }

        return merged;
    }
}
