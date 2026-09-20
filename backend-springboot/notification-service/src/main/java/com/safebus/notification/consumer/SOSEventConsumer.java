package com.safebus.notification.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.safebus.common.dto.WebSocketMessage;
import com.safebus.notification.websocket.WebSocketAlertHandler;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class SOSEventConsumer {
    private final WebSocketAlertHandler webSocketAlertHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SOSEventConsumer(WebSocketAlertHandler webSocketAlertHandler) {
        this.webSocketAlertHandler = webSocketAlertHandler;
    }

    @RabbitListener(queues = "sos-queue")
    public void consumeSOSEvent(Message amqpMessage) {
        try {
            byte[] body = amqpMessage.getBody();
            Map<String, Object> payload = null;

            try {
                // Try Jackson JSON first
                payload = objectMapper.readValue(body, Map.class);
            } catch (Exception e1) {
                // Fallback to Java deserialization
                try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(body))) {
                    Object obj = ois.readObject();
                    if (obj instanceof Map) {
                        payload = (Map<String, Object>) obj;
                    }
                }
            }

            if (payload == null) {
                System.err.println("[SOS Consumer Error] Could not deserialize message body.");
                return;
            }

            Map<String, Object> details = (payload.containsKey("payload") && payload.get("payload") instanceof Map)
                    ? (Map<String, Object>) payload.get("payload")
                    : payload;

            String sosId = (String) payload.getOrDefault("sos_id", payload.get("sosId"));
            String busId = (String) details.getOrDefault("busId", payload.get("busId"));
            String emergencyType = (String) details.getOrDefault("emergencyType", details.getOrDefault("emergency_type", "General Emergency"));

            System.out.println("[SOS Consumer] Received SOS alert. ID: " + sosId + ", Bus: " + busId + ", Type: " + emergencyType);

            // SOS alerts are strictly operational admin emergency alerts — NEVER persist to parent notification logs
            Map<String, Object> wsPayload = new HashMap<>(payload);
            wsPayload.put("sosId", sosId);
            wsPayload.put("busId", busId);
            wsPayload.put("emergencyType", emergencyType);

            WebSocketMessage msg = WebSocketMessage.builder()
                    .type("SOS")
                    .event("SOS_RAISED")
                    .severity("CRITICAL")
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .correlationId(UUID.randomUUID().toString())
                    .payload(wsPayload)
                    .build();

            webSocketAlertHandler.broadcast(msg);

        } catch (Exception e) {
            System.err.println("[SOS Consumer Error] Failed to process SOS event: " + e.getMessage());
        }
    }
}
