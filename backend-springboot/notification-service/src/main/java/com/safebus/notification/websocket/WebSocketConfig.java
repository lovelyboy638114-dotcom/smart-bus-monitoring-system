package com.safebus.notification.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;
import java.util.Map;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final WebSocketAlertHandler webSocketAlertHandler;

    public WebSocketConfig(WebSocketAlertHandler webSocketAlertHandler) {
        this.webSocketAlertHandler = webSocketAlertHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketAlertHandler, "/ws")
                .setAllowedOrigins("*")
                .addInterceptors(new HandshakeInterceptor() {
                    @Override
                    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
                        if (request instanceof ServletServerHttpRequest) {
                            ServletServerHttpRequest servletRequest = (ServletServerHttpRequest) request;
                            String token = servletRequest.getServletRequest().getParameter("token");
                            String roleParam = servletRequest.getServletRequest().getParameter("role");
                            String username = servletRequest.getServletRequest().getParameter("username");
                            String parentId = servletRequest.getServletRequest().getParameter("parentId");
                            String studentId = servletRequest.getServletRequest().getParameter("studentId");

                            String determinedRole = "UNKNOWN";
                            if (roleParam != null && !roleParam.trim().isEmpty()) {
                                determinedRole = roleParam.trim().toUpperCase();
                            } else if (token != null && token.contains(".")) {
                                try {
                                    String[] parts = token.split("\\.");
                                    if (parts.length >= 2) {
                                        String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]), java.nio.charset.StandardCharsets.UTF_8);
                                        if (payload.contains("\"role\":\"ADMIN\"") || payload.contains("\"role\":\"ROLE_ADMIN\"")) {
                                            determinedRole = "ADMIN";
                                        } else if (payload.contains("\"role\":\"PARENT\"") || payload.contains("\"role\":\"ROLE_PARENT\"")) {
                                            determinedRole = "PARENT";
                                        } else if (payload.contains("\"role\":\"DRIVER\"") || payload.contains("\"role\":\"ROLE_DRIVER\"")) {
                                            determinedRole = "DRIVER";
                                        } else if (payload.contains("\"role\":\"STUDENT\"") || payload.contains("\"role\":\"ROLE_STUDENT\"")) {
                                            determinedRole = "STUDENT";
                                        }
                                    }
                                } catch (Exception ignored) {}
                            }

                            attributes.put("token", token != null ? token : "anonymous");
                            attributes.put("role", determinedRole);
                            if (username != null) attributes.put("username", username);
                            if (parentId != null) attributes.put("parentId", parentId);
                            if (studentId != null) attributes.put("studentId", studentId);

                            System.out.println("[WebSocket Handshake] Registered session attribute role=" + determinedRole + 
                                    ", user=" + username + ", studentId=" + studentId);
                        }
                        return true;
                    }

                    @Override
                    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                               WebSocketHandler wsHandler, Exception exception) {
                    }
                });
    }
}
