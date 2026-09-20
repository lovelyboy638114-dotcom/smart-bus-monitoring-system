package com.safebus.notification.controller;

import com.safebus.notification.entity.ParentNotificationLog;
import com.safebus.notification.repository.ParentNotificationLogRepository;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "Parent Notification logging and history querying APIs")
public class NotificationController {
    private final ParentNotificationLogRepository repository;

    public NotificationController(ParentNotificationLogRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/logs/{studentId}")
    @Operation(summary = "Get Notification Logs", description = "Retrieve historical dispatched SMS/Email notification logs for a specific student.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Notification logs retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Server database query processing error")
    })
    public ResponseEntity<ApiResponse<List<ParentNotificationLog>>> getLogs(
            @Parameter(description = "Registered student roll number/id", example = "STU001") @PathVariable("studentId") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            List<ParentNotificationLog> rawLogs = repository.findByStudentIdOrderBySentAtDesc(studentId);
            // Defensive filtering: Parent logs must strictly consist of student attendance and journey events
            List<ParentNotificationLog> logs = rawLogs.stream()
                    .filter(log -> {
                        String type = log.getNotificationType();
                        if (type == null) return false;
                        String upper = type.toUpperCase();
                        return !upper.contains("FATIGUE") && !upper.contains("DROWSY") && !upper.contains("DISTRACT") && !upper.contains("SOS");
                    })
                    .collect(java.util.stream.Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success("Notification logs retrieved successfully", logs, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "NOT_001", correlationId));
        }
    }
}
