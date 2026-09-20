package com.safebus.notification.consumer;

import com.safebus.common.dto.WebSocketMessage;
import com.safebus.notification.websocket.WebSocketAlertHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Component
public class DriverIncidentConsumer {
    private final WebSocketAlertHandler webSocketAlertHandler;

    public DriverIncidentConsumer(WebSocketAlertHandler webSocketAlertHandler) {
        this.webSocketAlertHandler = webSocketAlertHandler;
    }

    @RabbitListener(queues = "driver-incident-queue")
    public void consumeDriverIncident(Map<String, Object> payload) {
        try {
            String driverId = payload.get("driverId") != null ? payload.get("driverId").toString() : "UNKNOWN";
            String busId = payload.get("busId") != null ? payload.get("busId").toString() : "UNKNOWN";
            String rawType = payload.get("incidentType") != null ? payload.get("incidentType").toString() :
                             payload.get("incident_type") != null ? payload.get("incident_type").toString() :
                             payload.get("status") != null ? payload.get("status").toString() :
                             payload.get("type") != null ? payload.get("type").toString() : "ALERT";
            String incidentType = rawType != null && !rawType.isBlank() ? rawType : "ALERT";
            String upper = incidentType.toUpperCase();

            // STRICT FILTER: Normal telemetry must NEVER be broadcast as a driver incident alert!
            if (upper.equals("NORMAL") || upper.equals("ATTENTIVE") || upper.equals("UNKNOWN") 
                    || upper.equals("NO_DRIVER_FACE_DETECTED") || upper.equals("SAFE") || upper.equals("OK")) {
                return; // Dropped! Normal states must never produce notifications.
            }

            payload.put("incidentType", incidentType);

            System.out.println("[Driver Incident Consumer] Confirmed incident alert. Driver: " + driverId + ", Bus: " + busId + ", Type: " + incidentType);

            // Driver incidents are strictly operational admin/fleet alerts — NEVER persist to parent notification logs
            WebSocketMessage msg = WebSocketMessage.builder()
                    .type("DRIVER_INCIDENT")
                    .event("DRIVER_" + upper)
                    .severity("HIGH")
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .correlationId(UUID.randomUUID().toString())
                    .payload(payload)
                    .build();

            webSocketAlertHandler.broadcast(msg);

        } catch (Exception e) {
            System.err.println("[Driver Incident Consumer Error] Failed to process driver event: " + e.getMessage());
        }
    }

    @RabbitListener(queues = "driver-telemetry-queue")
    public void consumeDriverTelemetry(Map<String, Object> payload) {
        try {
            WebSocketMessage msg = WebSocketMessage.builder()
                    .type("DRIVER_TELEMETRY")
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .correlationId(UUID.randomUUID().toString())
                    .payload(payload)
                    .build();

            webSocketAlertHandler.broadcast(msg);
        } catch (Exception e) {
            System.err.println("[Driver Telemetry Consumer Error] Failed to broadcast telemetry: " + e.getMessage());
        }
    }
}
