package com.safebus.student.event;

import com.safebus.common.dto.event.StudentRegisteredEventV1;
import com.safebus.student.config.RabbitConfig;
import com.safebus.student.entity.Student;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import java.time.LocalDateTime;
import java.util.UUID;

@Component
public class StudentRegistrationListener {

    private static final Logger log = LoggerFactory.getLogger(StudentRegistrationListener.class);
    private final RabbitTemplate rabbitTemplate;

    public StudentRegistrationListener(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleStudentRegisteredCommit(StudentRegistrationEvent event) {
        Student student = event.getStudent();
        log.info("[RegistrationListener] Transaction COMMITTED. Publishing registration event to RabbitMQ for student: {}", student.getId());

        StudentRegisteredEventV1 amqpEvent = StudentRegisteredEventV1.builder()
                .eventId("EVT_" + UUID.randomUUID().toString().replaceAll("-", ""))
                .correlationId(UUID.randomUUID().toString())
                .timestamp(LocalDateTime.now())
                .studentId(student.getId())
                .name(student.getName())
                .address(student.getAddress())
                .parentPhone(student.getParentPhone())
                .build();

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.REGISTRATION_EXCHANGE,
                    RabbitConfig.REGISTRATION_ROUTING_KEY,
                    amqpEvent
            );
            log.info("[RegistrationListener] Successfully published StudentRegisteredEventV1 to RabbitMQ exchange={}", RabbitConfig.REGISTRATION_EXCHANGE);
        } catch (Exception e) {
            log.error("[RegistrationListener] Failed to publish registration event to RabbitMQ: {}", e.getMessage(), e);
        }
    }
}
