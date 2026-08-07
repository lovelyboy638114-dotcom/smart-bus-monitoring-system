package com.safebus.assignment.controller;

import com.safebus.assignment.service.BusAssignmentService;
import com.safebus.common.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assignments")
public class AssignmentController {
    private final BusAssignmentService busAssignmentService;

    public AssignmentController(BusAssignmentService busAssignmentService) {
        this.busAssignmentService = busAssignmentService;
    }

    @PostMapping("/auto-assign/{studentId}")
    public ResponseEntity<ApiResponse<Boolean>> autoAssignBus(@PathVariable String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            boolean success = busAssignmentService.assignBusToStudent(studentId);
            if (success) {
                return ResponseEntity.ok(ApiResponse.success("Bus successfully assigned", true, correlationId));
            } else {
                return ResponseEntity.ok(ApiResponse.success("Bus assignment is pending manual review", false, correlationId));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "BUS_002", correlationId));
        }
    }
}
