package com.safebus.attendance.controller;

import com.safebus.attendance.dto.ScanRequest;
import com.safebus.attendance.entity.AttendanceLog;
import com.safebus.attendance.service.AttendanceService;
import com.safebus.common.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/scan")
    public ResponseEntity<ApiResponse<AttendanceLog>> processScan(@RequestBody ScanRequest req) {
        String correlationId = UUID.randomUUID().toString();
        try {
            AttendanceLog savedLog = attendanceService.logScan(req);
            return ResponseEntity.ok(ApiResponse.success("Scan processed successfully", savedLog, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.error(e.getMessage(), "BUS_001", correlationId));
        }
    }

    @GetMapping("/logs/{studentId}")
    public ResponseEntity<ApiResponse<List<AttendanceLog>>> getLogs(@PathVariable String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            List<AttendanceLog> logs = attendanceService.getStudentLogs(studentId);
            return ResponseEntity.ok(ApiResponse.success("Logs retrieved successfully", logs, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "BUS_002", correlationId));
        }
    }
}
