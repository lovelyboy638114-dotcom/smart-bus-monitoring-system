package com.safebus.student.controller;

import com.safebus.student.entity.*;
import com.safebus.student.service.SosService;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sos")
@Tag(name = "SOS Alerts", description = "SOS emergency alerts monitoring and resolution management APIs")
public class SosController {
    private final SosService sosService;

    public SosController(SosService sosService) {
        this.sosService = sosService;
    }

    @PostMapping
    @Operation(summary = "Trigger Emergency SOS Alert", description = "Dispatches a new emergency alert, publishes alert to notifications topic exchange, and computes nearest police station solvers.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "201", description = "SOS emergency alert logged successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Duplicate alert conflicts detected"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Database processing or station solver failure")
    })
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerSos(@RequestBody Map<String, Object> req) {
        String correlationId = UUID.randomUUID().toString();
        try {
            SosAlert alert = sosService.createSos(req);
            Map<String, Object> res = new HashMap<>();
            res.put("sos_id", alert.getSosId());
            res.put("bus_id", alert.getBusId());
            res.put("driver_name", alert.getDriverName());
            res.put("latitude", alert.getLatitude());
            res.put("longitude", alert.getLongitude());
            res.put("speed", alert.getSpeed());
            res.put("route", alert.getRouteName() != null ? alert.getRouteName() : "");
            res.put("emergency_type", alert.getEmergencyType());
            res.put("status", alert.getStatus().name());
            res.put("severity", alert.getSeverity().name());
            res.put("time", alert.getCreatedAt().toString());
            return ResponseEntity.status(201).body(ApiResponse.success("Emergency SOS alert triggered successfully.", res, correlationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(409).body(ApiResponse.error(e.getMessage(), "SOS_002", correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("SOS creation failed: " + e.getMessage(), "SOS_001", correlationId));
        }
    }

    @GetMapping("/active")
    @Operation(summary = "Get Active SOS Alerts", description = "Fetch a list of active emergency events along with resolved nearby police station responders and chronological log timelines.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Active alerts list retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Server database query processing error")
    })
    public ResponseEntity<List<Map<String, Object>>> getActiveSos() {
        try {
            List<SosAlert> alerts = sosService.getActiveSos();
            List<Map<String, Object>> response = new ArrayList<>();

            for (SosAlert a : alerts) {
                Map<String, Object> entry = new HashMap<>();
                entry.put("sos_id", a.getSosId());
                entry.put("bus_id", a.getBusId());
                entry.put("driver_name", a.getDriverName());
                entry.put("latitude", a.getLatitude());
                entry.put("longitude", a.getLongitude());
                entry.put("speed", a.getSpeed());
                entry.put("route", a.getRouteName() != null ? a.getRouteName() : "");
                entry.put("emergency_type", a.getEmergencyType());
                entry.put("status", a.getStatus().name());
                entry.put("severity", a.getSeverity().name());
                entry.put("time", a.getCreatedAt().toString());
                entry.put("parent_notified", a.getParentNotified());
                entry.put("admin_notified", a.getAdminNotified());

                PoliceStation ps = sosService.getPoliceStation(a.getPoliceStationId());
                if (ps != null) {
                    entry.put("police_station", Map.of(
                            "name", ps.getStationName(),
                            "phone", ps.getPhone(),
                            "email", ps.getEmail() != null ? ps.getEmail() : "",
                            "address", ps.getAddress()
                    ));
                } else {
                    entry.put("police_station", null);
                }

                List<SosAuditLog> audits = sosService.getTimeline(a.getSosId());
                List<Map<String, Object>> timeline = new ArrayList<>();
                for (SosAuditLog audit : audits) {
                    timeline.add(Map.of(
                            "time", audit.getTimestamp().toString(),
                            "action", audit.getAction(),
                            "performed_by", audit.getPerformedBy(),
                            "remarks", audit.getRemarks() != null ? audit.getRemarks() : ""
                    ));
                }
                entry.put("timeline", timeline);

                response.add(entry);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/history")
    @Operation(summary = "Get SOS Resolve History", description = "Query resolved SOS emergency alerts archive details.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Historical reports retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Server database query processing error")
    })
    public ResponseEntity<List<SosAlert>> getSosHistory() {
        try {
            List<SosAlert> history = sosService.getSosHistory();
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }

    @GetMapping("/statistics")
    @Operation(summary = "Get SOS Alerts Statistics", description = "Query aggregated stats on total, resolved, average acknowledgment, and severity of SOS alerts.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "SOS alerts statistics retrieved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Server database query processing error")
    })
    public ResponseEntity<Map<String, Object>> getSosStatistics() {
        try {
            Map<String, Object> statistics = sosService.getSosStatistics();
            return ResponseEntity.ok(statistics);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        }
    }


    @PostMapping("/{sosId}/acknowledge")
    @Operation(summary = "Acknowledge Active SOS", description = "Enables command dispatchers or admins to register acknowledgment logs for an active SOS sequence.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "SOS Acknowledged successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "SOS Alert ID not found"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Server database logging processing failure")
    })
    public ResponseEntity<ApiResponse<SosAlert>> acknowledgeSos(
            @Parameter(description = "UUID identifying the active SOS alert", example = "sos-uuid-88989") @PathVariable String sosId,
            @Parameter(description = "Name of the admin operator performing the override", example = "Admin Center") @RequestParam(defaultValue = "Admin Command Center") String adminUser,
            HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        try {
            String ip = request.getRemoteAddr();
            String ua = request.getHeader("User-Agent");
            String device = "Desktop (Web browser)";

            SosAlert alert = sosService.acknowledgeSos(sosId, adminUser, ip, ua, device);
            return ResponseEntity.ok(ApiResponse.success("SOS Alert acknowledged", alert, correlationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage(), "SOS_404", correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error(e.getMessage(), "SOS_005", correlationId));
        }
    }

    @PostMapping("/{sosId}/resolve")
    @Operation(summary = "Resolve SOS Alert", description = "Appends resolution remarks and marks the emergency event status as completed.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "SOS alert resolved successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid parameter remarks supplied"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "SOS Alert ID not found")
    })
    public ResponseEntity<ApiResponse<SosAlert>> resolveSos(
            @Parameter(description = "UUID identifying the active SOS alert", example = "sos-uuid-88989") @PathVariable String sosId,
            @Parameter(description = "Remarks summarizing the resolution action", example = "Tire flat resolved. Backup bus assigned.") @RequestParam String remarks,
            @Parameter(description = "Name of the resolving operator", example = "Admin Center") @RequestParam(defaultValue = "Admin Command Center") String adminUser) {
        String correlationId = UUID.randomUUID().toString();
        try {
            SosAlert alert = sosService.resolveSos(sosId, adminUser, remarks);
            return ResponseEntity.ok(ApiResponse.success("SOS Alert resolved", alert, correlationId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage(), "SOS_404", correlationId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage(), "SOS_400", correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error(e.getMessage(), "SOS_006", correlationId));
        }
    }
}
