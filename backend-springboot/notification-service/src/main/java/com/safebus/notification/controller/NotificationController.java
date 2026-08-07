package com.safebus.notification.controller;

import com.safebus.notification.entity.ParentNotificationLog;
import com.safebus.notification.repository.ParentNotificationLogRepository;
import com.safebus.common.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final ParentNotificationLogRepository repository;

    public NotificationController(ParentNotificationLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/logs/{studentId}")
    public ResponseEntity<ApiResponse<List<ParentNotificationLog>>> getLogs(@PathVariable String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            List<ParentNotificationLog> logs = repository.findByStudentIdOrderBySentAtDesc(studentId);
            return ResponseEntity.ok(ApiResponse.success("Notification logs retrieved successfully", logs, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "NOT_001", correlationId));
        }
    }
}
