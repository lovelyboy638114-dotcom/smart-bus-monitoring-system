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
public class IdCardEventConsumer {

    private final WebSocketAlertHandler webSocketAlertHandler;

    public IdCardEventConsumer(WebSocketAlertHandler webSocketAlertHandler) {
        this.webSocketAlertHandler = webSocketAlertHandler;
    }

    @RabbitListener(queues = "idcard-progress-queue")
    public void consumeIdCardEvent(Map<String, Object> payload) {
        try {
            System.out.println("[IdCard Consumer] Received ID Card event. Payload: " + payload);

            WebSocketMessage msg = WebSocketMessage.builder()
                    .type("ID_CARD")
                    .event("PROGRESS_UPDATE")
                    .severity("INFO")
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .correlationId((String) payload.getOrDefault("correlationId", UUID.randomUUID().toString()))
                    .payload(payload)
                    .build();

            webSocketAlertHandler.broadcast(msg);
        } catch (Exception e) {
            System.err.println("[IdCard Consumer Error] Failed to process ID Card event: " + e.getMessage());
        }
    }
}
