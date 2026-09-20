package com.safebus.student.consumer;

import com.safebus.common.dto.event.StudentRegisteredEventV1;
import com.safebus.student.config.RabbitConfig;
import com.safebus.student.entity.Student;
import com.safebus.student.repository.StudentRepository;
import com.safebus.student.service.IDCardService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Date;
import java.util.Optional;

@Slf4j
@Component
public class StudentRegisteredConsumer {

    private final StudentRepository studentRepository;
    private final IDCardService idCardService;
    private final JdbcTemplate jdbcTemplate;

    public StudentRegisteredConsumer(StudentRepository studentRepository, IDCardService idCardService, JdbcTemplate jdbcTemplate) {
        this.studentRepository = studentRepository;
        this.idCardService = idCardService;
        this.jdbcTemplate = jdbcTemplate;
    }

    @RabbitListener(queues = RabbitConfig.REGISTRATION_QUEUE)
    public void consumeStudentRegistration(StudentRegisteredEventV1 event) {
        long startTime = System.currentTimeMillis();
        String eventId = event.getEventId() != null ? event.getEventId() : "evt_" + java.util.UUID.randomUUID().toString();
        String correlationId = event.getCorrelationId() != null ? event.getCorrelationId() : "corr_" + java.util.UUID.randomUUID().toString();
        String studentId = event.getStudentId();
        String eventType = "StudentRegisteredEventV1";

        log.info("[RegisteredConsumer] Received registration event. EventId: {}, StudentId: {}, CorrelationId: {}", 
                eventId, studentId, correlationId);

        // 1. Idempotency Check
        try {
            jdbcTemplate.update(
                    "INSERT INTO processed_student_events (event_id, event_type, student_id, correlation_id, status, processed_at, processing_duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    eventId, eventType, studentId, correlationId, "PROCESSING", new Date(), 0L
            );
        } catch (org.springframework.dao.DuplicateKeyException dke) {
            log.warn("[RegisteredConsumer] Duplicate event detected. EventId: {} already processed. Skipping.", eventId);
            return;
        }

        try {
            Optional<Student> studentOpt = studentRepository.findById(studentId);
            if (studentOpt.isEmpty()) {
                log.warn("[RegisteredConsumer] Student {} not found in database. Skipping card generation.", studentId);
                jdbcTemplate.update("UPDATE processed_student_events SET status = ?, processing_duration_ms = ? WHERE event_id = ?",
                        "SKIPPED_NOT_FOUND", (System.currentTimeMillis() - startTime), eventId);
                return;
            }

            Student student = studentOpt.get();

            // Wait! We only generate the ID card if a bus has been assigned. If it is BUS_PENDING, we do not generate it yet.
            if ("BUS_PENDING".equals(student.getStatus()) || student.getBusId() == null || student.getBusId().isEmpty()) {
                log.info("[RegisteredConsumer] Student {} bus assignment is pending. ID Card generation deferred.", student.getId());
                jdbcTemplate.update("UPDATE processed_student_events SET status = ?, processing_duration_ms = ? WHERE event_id = ?",
                        "DEFERRED_BUS_PENDING", (System.currentTimeMillis() - startTime), eventId);
                return;
            }

            log.info("[RegisteredConsumer] Launching asynchronous ID Card generation orchestrator...");
            idCardService.generateIDCard(studentId, correlationId);

            jdbcTemplate.update("UPDATE processed_student_events SET status = ?, processing_duration_ms = ? WHERE event_id = ?",
                    "COMPLETED", (System.currentTimeMillis() - startTime), eventId);
            log.info("[RegisteredConsumer] Successfully completed processing registration event for student: {}", studentId);

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("[RegisteredConsumer] Asynchronous ID Card generation failed: {}", e.getMessage(), e);
            jdbcTemplate.update("UPDATE processed_student_events SET status = ?, processing_duration_ms = ? WHERE event_id = ?",
                    "FAILED", duration, eventId);
        }
    }
}
