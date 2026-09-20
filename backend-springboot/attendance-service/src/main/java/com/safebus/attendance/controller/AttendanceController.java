package com.safebus.attendance.controller;

import com.safebus.attendance.dto.ScanRequest;
import com.safebus.attendance.entity.AttendanceLog;
import com.safebus.attendance.service.AttendanceService;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@Tag(name = "Attendance", description = "Attendance Scan management APIs for student boarding and drops check-ins")
public class AttendanceController {
    private final AttendanceService attendanceService;

    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/scan")
    @Operation(summary = "Process RFID/QR Scan", description = "Logs a passenger transit (board or drop) scan event and sends websocket push notifications to parents.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Scan logged successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid payload or duplicate scan scan error")
    })
    public ResponseEntity<com.safebus.common.dto.response.ApiResponse<AttendanceLog>> processScan(@RequestBody ScanRequest req) {
        String correlationId = UUID.randomUUID().toString();
        try {
            AttendanceLog savedLog = attendanceService.logScan(req);
            return ResponseEntity.ok(com.safebus.common.dto.response.ApiResponse.success("Scan processed successfully", savedLog, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(com.safebus.common.dto.response.ApiResponse.error(e.getMessage(), "BUS_001", correlationId));
        }
    }

    @GetMapping("/logs/{studentId}")
    @Operation(summary = "Retrieve Passenger Logs", description = "Fetch chronological attendance scan records for a specific student.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Logs retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Internal server processing query error")
    })
    public ResponseEntity<com.safebus.common.dto.response.ApiResponse<List<AttendanceLog>>> getLogs(
            @Parameter(description = "Registered student roll number/id", example = "STU001") @PathVariable("studentId") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            List<AttendanceLog> logs = attendanceService.getStudentLogs(studentId);
            return ResponseEntity.ok(com.safebus.common.dto.response.ApiResponse.success("Logs retrieved successfully", logs, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(com.safebus.common.dto.response.ApiResponse.error(e.getMessage(), "BUS_002", correlationId));
        }
    }

    @PostMapping("/reset")
    @Operation(summary = "Reset Daily Attendance", description = "Resets boarded and attendance status to Absent for a new session or bus.")
    public ResponseEntity<com.safebus.common.dto.response.ApiResponse<String>> resetAttendance(
            @RequestParam(value = "busId", required = false) String busId,
            @RequestParam(value = "shift", required = false) String shift) {
        String correlationId = UUID.randomUUID().toString();
        try {
            attendanceService.resetDailyAttendance(busId, shift);
            return ResponseEntity.ok(com.safebus.common.dto.response.ApiResponse.success("Daily attendance reset successfully", "Reset complete", correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(com.safebus.common.dto.response.ApiResponse.error(e.getMessage(), "BUS_RESET_ERR", correlationId));
        }
    }

    @PostMapping("/mark-absent")
    @Operation(summary = "Mark Student Absent", description = "Explicitly sets a student's attendance to Absent.")
    public ResponseEntity<com.safebus.common.dto.response.ApiResponse<String>> markAbsent(
            @RequestParam("studentId") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            attendanceService.markStudentAbsent(studentId);
            return ResponseEntity.ok(com.safebus.common.dto.response.ApiResponse.success("Student marked absent", studentId, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(com.safebus.common.dto.response.ApiResponse.error(e.getMessage(), "BUS_ABSENT_ERR", correlationId));
        }
    }
}
