package com.safebus.notification.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safebus.common.dto.WebSocketMessage;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketAlertHandler extends TextWebSocketHandler {
    private static final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        WebSocketSession concurrentSession = new ConcurrentWebSocketSessionDecorator(session, 10000, 64 * 1024);
        sessions.put(session.getId(), concurrentSession);
        System.out.println("[WebSocket] Session established: " + session.getId() + ". Total sessions: " + sessions.size());
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        System.out.println("[WebSocket] Session closed: " + session.getId() + ". Total sessions: " + sessions.size());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        System.out.println("[WebSocket] Received text message: " + message.getPayload());
    }

    public void broadcast(WebSocketMessage message) {
        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            System.err.println("[WebSocket] Failed to serialize message: " + e.getMessage());
            return;
        }

        TextMessage textMessage = new TextMessage(jsonPayload);
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen() && isRecipientAllowed(session, message)) {
                try {
                    synchronized (session) {
                        if (session.isOpen()) {
                            session.sendMessage(textMessage);
                        }
                    }
                } catch (IOException e) {
                    System.err.println("[WebSocket] Failed to send message to session " + session.getId() + ": " + e.getMessage());
                }
            }
        }
    }

    public void sendToAdmins(WebSocketMessage message) {
        sendToRole("ADMIN", message);
    }

    public void sendToParents(WebSocketMessage message) {
        sendToRole("PARENT", message);
    }

    public void sendToRole(String targetRole, WebSocketMessage message) {
        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(message);
        } catch (Exception e) {
            System.err.println("[WebSocket] Failed to serialize message for role " + targetRole + ": " + e.getMessage());
            return;
        }

        TextMessage textMessage = new TextMessage(jsonPayload);
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) {
                String sessionRole = (String) session.getAttributes().getOrDefault("role", "UNKNOWN");
                if (targetRole.equalsIgnoreCase(sessionRole) || ("ADMIN".equalsIgnoreCase(sessionRole) && !"ADMIN".equalsIgnoreCase(targetRole))) {
                    try {
                        synchronized (session) {
                            if (session.isOpen()) {
                                session.sendMessage(textMessage);
                            }
                        }
                    } catch (IOException e) {
                        System.err.println("[WebSocket] Failed to send role message to session " + session.getId() + ": " + e.getMessage());
                    }
                }
            }
        }
    }

    /**
     * Strict notification ownership enforcement:
     * - ADMIN: Receives all system, driver safety, telemetry, SOS, and attendance events.
     * - DRIVER: Receives operational alerts, their bus telemetry, and attendance.
     * - PARENT: Receives ONLY student attendance, ID card updates, and bus arrival/ETA events.
     *           STRICTLY FORBIDDEN from receiving driver fatigue, distraction, camera analysis, and SOS.
     * - ANONYMOUS/UNKNOWN: Blocked from operational driver and SOS alerts.
     */
    private boolean isRecipientAllowed(WebSocketSession session, WebSocketMessage message) {
        String role = (String) session.getAttributes().getOrDefault("role", "UNKNOWN");
        String type = message.getType() != null ? message.getType().toUpperCase() : "";

        // Admin receives operational alerts, driver safety, telemetry, SOS, and transit events
        if ("ADMIN".equalsIgnoreCase(role) || "ROLE_ADMIN".equalsIgnoreCase(role)) {
            return true;
        }

        // Driver receives telemetry and emergency SOS
        if ("DRIVER".equalsIgnoreCase(role) || "ROLE_DRIVER".equalsIgnoreCase(role)) {
            return "DRIVER_TELEMETRY".equals(type) 
                || "SOS".equals(type)
                || "SOS_ALERT".equals(type);
        }

        // Parent receives ONLY attendance, ID card, and bus arrival/ETA events. NEVER driver incidents, driver analysis, or SOS.
        if ("PARENT".equalsIgnoreCase(role) || "ROLE_PARENT".equalsIgnoreCase(role)) {
            if ("DRIVER_INCIDENT".equals(type) 
                || "DRIVER_TELEMETRY".equals(type) 
                || "DRIVER_BEHAVIOR".equals(type) 
                || "DRIVER_ANALYSIS".equals(type)
                || "SOS".equals(type) 
                || "SOS_ALERT".equals(type)
                || "SYSTEM_ALERT".equals(type)) {
                return false; // STRICTLY FORBIDDEN FOR PARENTS
            }

            // If session is bound to a specific student, ensure attendance event belongs to their child
            if ("ATTENDANCE".equals(type)) {
                String sessionStudentId = (String) session.getAttributes().get("studentId");
                if (sessionStudentId != null && !sessionStudentId.isBlank() && message.getPayload() instanceof Map) {
                    Map<?, ?> payloadMap = (Map<?, ?>) message.getPayload();
                    Object msgStudentId = payloadMap.get("studentId");
                    if (msgStudentId != null && !sessionStudentId.equalsIgnoreCase(msgStudentId.toString())) {
                        return false; // Suppress another student's attendance from this parent session
                    }
                }
            }

            // Allowed types for parents:
            return "ATTENDANCE".equals(type) 
                || "BUS_ARRIVAL".equals(type) 
                || "BUS_APPROACHING".equals(type) 
                || "BUS_LOCATION".equals(type) 
                || "BUS_ETA".equals(type) 
                || "STOP_APPROACHING".equals(type) 
                || "ID_CARD".equals(type);
        }

        // Student receives attendance, ID card, bus arrival, bus location
        if ("STUDENT".equalsIgnoreCase(role) || "ROLE_STUDENT".equalsIgnoreCase(role)) {
            return "ATTENDANCE".equals(type) 
                || "BUS_ARRIVAL".equals(type) 
                || "BUS_APPROACHING".equals(type) 
                || "BUS_LOCATION".equals(type) 
                || "BUS_ETA".equals(type) 
                || "STOP_APPROACHING".equals(type) 
                || "ID_CARD".equals(type);
        }

        // For UNKNOWN/anonymous sessions, do NOT send driver camera alerts, driver analysis, or SOS
        if ("DRIVER_INCIDENT".equals(type) 
            || "DRIVER_TELEMETRY".equals(type) 
            || "DRIVER_BEHAVIOR".equals(type) 
            || "DRIVER_ANALYSIS".equals(type)
            || "SOS".equals(type) 
            || "SOS_ALERT".equals(type)) {
            return false;
        }

        return true;
    }

    public static int getSessionCount() {
        return sessions.size();
    }
}
