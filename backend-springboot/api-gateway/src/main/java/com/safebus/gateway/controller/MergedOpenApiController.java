package com.safebus.gateway.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.io.File;
import java.io.InputStream;
import java.net.URI;
import java.util.*;

@RestController
public class MergedOpenApiController {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private volatile Map<String, Object> cachedSpec = null;

    private static final String SWAGGER_UI_HTML = """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>SafeBus Shield — Unified Microservices API</title>
              <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css">
              <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'><path d='M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 8.96-7 10.02-3.87-1.06-7-5.35-7-10.02V6.3l7-3.12z'/></svg>">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  background: #f8fafc;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .topbar {
                  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%) !important;
                  padding: 14px 24px !important;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .topbar .wrapper {
                  max-width: 1460px;
                  margin: 0 auto;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                }
                .topbar-brand {
                  display: flex;
                  align-items: center;
                  gap: 12px;
                  color: #ffffff;
                  text-decoration: none;
                  font-size: 1.25rem;
                  font-weight: 700;
                  letter-spacing: -0.025em;
                }
                .topbar-badge {
                  display: inline-flex;
                  align-items: center;
                  padding: 2px 8px;
                  background: rgba(59, 130, 246, 0.2);
                  border: 1px solid rgba(59, 130, 246, 0.4);
                  color: #60a5fa;
                  font-size: 0.75rem;
                  font-weight: 600;
                  border-radius: 9999px;
                  margin-left: 8px;
                }
                .topbar-links {
                  display: flex;
                  align-items: center;
                  gap: 18px;
                }
                .topbar-link {
                  color: #94a3b8;
                  text-decoration: none;
                  font-size: 0.875rem;
                  font-weight: 500;
                  transition: color 0.15s ease;
                }
                .topbar-link:hover {
                  color: #ffffff;
                }
                .swagger-ui .information-container {
                  background: #ffffff;
                  border-radius: 12px;
                  padding: 24px 32px;
                  margin-top: 24px;
                  margin-bottom: 24px;
                  border: 1px solid #e2e8f0;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
                }
                .swagger-ui .info {
                  margin: 0 !important;
                }
                .swagger-ui .info .title {
                  font-size: 2rem !important;
                  color: #0f172a !important;
                }
                .swagger-ui .scheme-container {
                  background: #ffffff !important;
                  box-shadow: none !important;
                  border-bottom: 1px solid #e2e8f0;
                  padding: 16px 0 !important;
                }
                .swagger-ui .opblock {
                  border-radius: 8px !important;
                  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
                }
                .swagger-ui .btn.authorize {
                  border-color: #2563eb !important;
                  color: #2563eb !important;
                  background-color: transparent !important;
                  border-radius: 6px !important;
                  font-weight: 600;
                }
                .swagger-ui .btn.authorize svg {
                  fill: #2563eb !important;
                }
                .swagger-ui .btn.authorize:hover {
                  background-color: #eff6ff !important;
                }
              </style>
            </head>
            <body>
              <div class="topbar">
                <div class="wrapper">
                  <a href="/swagger-ui" class="topbar-brand">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.67-3.13 8.96-7 10.02-3.87-1.06-7-5.35-7-10.02V6.3l7-3.12z"/></svg>
                    SafeBus Shield API Console
                    <span class="topbar-badge">v1.0.0 Unified</span>
                  </a>
                  <div class="topbar-links">
                    <a href="https://safebus-frontend-production.up.railway.app" class="topbar-link" target="_blank" rel="noopener">🌐 Live Web App</a>
                    <a href="/v3/api-docs/all" class="topbar-link" target="_blank" rel="noopener">📄 Raw OpenAPI JSON</a>
                    <a href="/health" class="topbar-link" target="_blank" rel="noopener">🩺 Health</a>
                  </div>
                </div>
              </div>

              <div id="swagger-ui"></div>

              <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
              <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
              <script>
                window.onload = function() {
                  window.ui = SwaggerUIBundle({
                    urls: [
                      { url: "/v3/api-docs/all", name: "🌟 ALL Services (Unified Complete API)" },
                      { url: "/v3/api-docs/auth", name: "🔐 Auth Service" },
                      { url: "/v3/api-docs/student", name: "🎓 Student & ID Cards Service" },
                      { url: "/v3/api-docs/transport", name: "🚌 Transport & Fleet Telemetry Service" },
                      { url: "/v3/api-docs/attendance", name: "📋 Attendance & Boarding Service" },
                      { url: "/v3/api-docs/driver", name: "🚦 Driver Safety & Telematics Service" },
                      { url: "/v3/api-docs/sos", name: "🚨 Emergency SOS Service" },
                      { url: "/v3/api-docs/notification", name: "🔔 Notification Service" },
                      { url: "/v3/api-docs/cv", name: "👁️ Computer Vision AI Service" }
                    ],
                    "urls.primaryName": "🌟 ALL Services (Unified Complete API)",
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                      SwaggerUIBundle.presets.apis,
                      SwaggerUIStandalonePreset
                    ],
                    plugins: [
                      SwaggerUIBundle.plugins.DownloadUrl
                    ],
                    layout: "StandaloneLayout",
                    persistAuthorization: true,
                    displayRequestDuration: true,
                    docExpansion: "list",
                    filter: true,
                    showCommonExtensions: true,
                    tryItOutEnabled: true
                  });
                };
              </script>
            </body>
            </html>
            """;

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
        health.put("swagger_ui", "https://safebus-backend-production-dd43.up.railway.app/swagger-ui");
        return Mono.just(health);
    }

    @GetMapping(value = {
            "/swagger-ui",
            "/swagger-ui/",
            "/swagger-ui.html",
            "/swagger-ui/index.html",
            "/swagger",
            "/docs",
            "/api-docs"
    }, produces = MediaType.TEXT_HTML_VALUE)
    public Mono<String> swaggerUi() {
        return Mono.just(SWAGGER_UI_HTML);
    }

    @GetMapping(value = {"/v3/api-docs", "/v3/api-docs/all", "/v3/api-docs/merged"}, produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> getMergedOpenApiDocs(ServerWebExchange exchange) {
        return Mono.fromCallable(() -> getDynamicSpec(exchange, "all"));
    }

    @GetMapping(value = "/v3/api-docs/{service}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<Map<String, Object>> getServiceOpenApiDocs(@PathVariable("service") String service, ServerWebExchange exchange) {
        return Mono.fromCallable(() -> getDynamicSpec(exchange, service));
    }

    private Map<String, Object> getDynamicSpec(ServerWebExchange exchange, String service) {
        Map<String, Object> base = loadMergedSpec();
        Map<String, Object> copy = new LinkedHashMap<>(base);

        // Determine request origin dynamically for live "Try it out" calls
        String proto = exchange.getRequest().getHeaders().getFirst("X-Forwarded-Proto");
        if (proto == null || proto.isBlank()) {
            proto = exchange.getRequest().getURI().getScheme();
        }
        String host = exchange.getRequest().getHeaders().getFirst("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = exchange.getRequest().getHeaders().getFirst("Host");
        }
        if (host == null || host.isBlank()) {
            host = exchange.getRequest().getURI().getAuthority();
        }
        String origin = (proto != null && host != null) ? (proto + "://" + host) : "https://safebus-backend-production-dd43.up.railway.app";

        List<Map<String, String>> servers = new ArrayList<>();
        servers.add(Map.of("url", origin, "description", "Current Gateway Origin (" + origin + ")"));
        servers.add(Map.of("url", "https://safebus-backend-production-dd43.up.railway.app", "description", "Production Cloud API Gateway"));
        servers.add(Map.of("url", "https://safebus-frontend-production.up.railway.app", "description", "Frontend Reverse Proxy"));
        servers.add(Map.of("url", "http://localhost:8080", "description", "Local Development API Gateway"));
        copy.put("servers", servers);

        if (service != null && !service.isBlank() && !service.equalsIgnoreCase("all") && !service.equalsIgnoreCase("merged")) {
            return filterSpecForService(copy, service);
        }
        return copy;
    }

    private Map<String, Object> filterSpecForService(Map<String, Object> fullSpec, String service) {
        String s = service.toLowerCase().trim();
        Set<String> targetTags = new HashSet<>();
        if (s.contains("auth")) {
            targetTags.add("Authentication & Accounts");
        } else if (s.contains("student")) {
            targetTags.add("Students & ID Cards");
            targetTags.add("Admin Registration & Stats");
        } else if (s.contains("transport") || s.contains("fleet") || s.contains("bus")) {
            targetTags.add("Fleet Tracking & Telemetry");
        } else if (s.contains("driver")) {
            targetTags.add("Driver Safety & Telematics");
        } else if (s.contains("attendance")) {
            targetTags.add("Attendance & Boarding");
        } else if (s.contains("sos")) {
            targetTags.add("Emergency SOS Alerts");
        } else if (s.contains("notif")) {
            targetTags.add("Notifications & Alerts");
        } else if (s.contains("cv")) {
            targetTags.add("Computer Vision & Edge AI");
        }

        if (targetTags.isEmpty()) {
            return fullSpec;
        }

        Map<String, Object> filtered = new LinkedHashMap<>(fullSpec);
        Object pathsObj = fullSpec.get("paths");
        if (pathsObj instanceof Map<?, ?> pathsMap) {
            Map<String, Object> newPaths = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : pathsMap.entrySet()) {
                String pathKey = String.valueOf(entry.getKey());
                Object pathItem = entry.getValue();
                if (pathItem instanceof Map<?, ?> operations) {
                    boolean matches = false;
                    for (Object opObj : operations.values()) {
                        if (opObj instanceof Map<?, ?> opMap) {
                            Object tagsObj = opMap.get("tags");
                            if (tagsObj instanceof List<?> tagsList) {
                                for (Object tag : tagsList) {
                                    if (targetTags.contains(String.valueOf(tag))) {
                                        matches = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if (matches) break;
                    }
                    if (matches) {
                        newPaths.put(pathKey, pathItem);
                    }
                }
            }
            filtered.put("paths", newPaths);
        }

        Object tagsObj = fullSpec.get("tags");
        if (tagsObj instanceof List<?> tagsList) {
            List<Object> newTags = new ArrayList<>();
            for (Object tagItem : tagsList) {
                if (tagItem instanceof Map<?, ?> tMap) {
                    String name = (String) tMap.get("name");
                    if (targetTags.contains(name)) {
                        newTags.add(tagItem);
                    }
                }
            }
            filtered.put("tags", newTags);
        }

        return filtered;
    }

    private Map<String, Object> loadMergedSpec() {
        if (cachedSpec != null) {
            return cachedSpec;
        }
        synchronized (this) {
            if (cachedSpec != null) {
                return cachedSpec;
            }

            // 1. Check classpath
            try {
                Resource resource = new ClassPathResource("openapi-merged.json");
                if (resource.exists()) {
                    try (InputStream is = resource.getInputStream()) {
                        cachedSpec = objectMapper.readValue(is, new TypeReference<Map<String, Object>>() {});
                        return cachedSpec;
                    }
                }
            } catch (Exception e) {
                System.err.println("[MergedOpenApiController] Could not load from classpath: " + e.getMessage());
            }

            // 2. Fallback to candidate file paths
            String[] candidatePaths = {
                    "/app/config/openapi-merged.json",
                    "config/openapi-merged.json",
                    "backend-springboot/api-gateway/src/main/resources/openapi-merged.json",
                    "src/main/resources/openapi-merged.json",
                    "openapi-merged.json"
            };
            for (String path : candidatePaths) {
                try {
                    File f = new File(path);
                    if (f.exists()) {
                        cachedSpec = objectMapper.readValue(f, new TypeReference<Map<String, Object>>() {});
                        return cachedSpec;
                    }
                } catch (Exception e) {
                    System.err.println("[MergedOpenApiController] Could not load from " + path + ": " + e.getMessage());
                }
            }

            // 3. Fallback skeleton
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("openapi", "3.0.1");
            fallback.put("info", Map.of("title", "SafeBus Shield Unified API", "version", "1.0.0"));
            fallback.put("paths", Collections.emptyMap());
            return fallback;
        }
    }
}
