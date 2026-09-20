package com.safebus.notification.consumer;

import com.safebus.common.dto.WebSocketMessage;
import com.safebus.notification.service.WhatsAppNotificationService;
import com.safebus.notification.websocket.WebSocketAlertHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Component
public class BusLocationConsumer {

    private final WebSocketAlertHandler webSocketAlertHandler;
    private final WhatsAppNotificationService whatsAppNotificationService;

    public BusLocationConsumer(WebSocketAlertHandler webSocketAlertHandler,
                               WhatsAppNotificationService whatsAppNotificationService) {
        this.webSocketAlertHandler = webSocketAlertHandler;
        this.whatsAppNotificationService = whatsAppNotificationService;
    }

    @RabbitListener(queues = "bus-location-queue")
    public void consumeBusTelemetry(Map<String, Object> payload) {
        try {
            String type = (String) payload.getOrDefault("type", "BUS_LOCATION");

            if ("BUS_APPROACHING".equalsIgnoreCase(type) || "BUS_ARRIVAL".equalsIgnoreCase(type)) {
                String studentId = (String) payload.get("studentId");
                String parentPhone = (String) payload.get("parentPhone");
                String studentName = (String) payload.get("studentName");
                String busId = (String) payload.get("busId");
                String stopName = (String) payload.get("stopName");
                double distanceKm = payload.get("distanceKm") != null ? Double.parseDouble(payload.get("distanceKm").toString()) : 2.0;
                int etaMinutes = payload.get("etaMinutes") != null ? Integer.parseInt(payload.get("etaMinutes").toString()) : 5;

                // Dispatch WhatsApp notification & persist record
                String sentMessage = whatsAppNotificationService.sendApproachingAlert(
                        studentId, parentPhone, studentName, busId, distanceKm, etaMinutes, stopName);
                
                String rawDigits = (parentPhone != null ? parentPhone.replaceAll("[^0-9]", "") : "7010846064");
                String intlPhone = rawDigits.length() == 10 ? "91" + rawDigits : rawDigits;
                String whatsappUrl = "https://api.whatsapp.com/send?phone=" + intlPhone + 
                        "&text=" + java.net.URLEncoder.encode(sentMessage, java.nio.charset.StandardCharsets.UTF_8);

                payload.put("message", sentMessage);
                payload.put("deliveryMethod", "WHATSAPP");
                payload.put("parentPhone", intlPhone);
                payload.put("whatsappUrl", whatsappUrl);

                // Broadcast to WebSockets
                WebSocketMessage msg = WebSocketMessage.builder()
                        .type("BUS_APPROACHING")
                        .event("BUS_2KM_ALERT")
                        .severity("MEDIUM")
                        .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .correlationId(UUID.randomUUID().toString())
                        .payload(payload)
                        .build();

                webSocketAlertHandler.broadcast(msg);

            } else {
                // Regular live coordinate broadcast for Leaflet Map
                WebSocketMessage msg = WebSocketMessage.builder()
                        .type("BUS_LOCATION")
                        .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                        .correlationId(UUID.randomUUID().toString())
                        .payload(payload)
                        .build();

                webSocketAlertHandler.broadcast(msg);
            }

        } catch (Exception e) {
            System.err.println("[BusLocationConsumer Error] Failed to process bus telemetry: " + e.getMessage());
        }
    }
}
