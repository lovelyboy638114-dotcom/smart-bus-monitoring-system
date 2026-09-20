package com.safebus.student.websocket;

import com.safebus.student.entity.IdCardGenerationStage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class IdCardProgressPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishProgress(String studentId, IdCardGenerationStage stage, int progress, String correlationId) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("version", "1");
            payload.put("type", "ID_CARD_PROGRESS");
            payload.put("studentId", studentId);
            payload.put("stage", stage.name());
            payload.put("progress", progress);
            payload.put("correlationId", correlationId);
            payload.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

            rabbitTemplate.convertAndSend("student-exchange", "student.event.idcard.progress", payload);
            log.info("[ProgressPublisher] Dispatched progress event. Student: {}, Stage: {}, Progress: {}%", studentId, stage, progress);
        } catch (Exception e) {
            log.error("[ProgressPublisher] Failed to publish progress to RabbitMQ: ", e);
        }
    }
}
