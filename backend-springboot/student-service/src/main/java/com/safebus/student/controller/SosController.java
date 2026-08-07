package com.safebus.student.controller;

import com.safebus.student.entity.*;
import com.safebus.student.service.SosService;
import com.safebus.common.dto.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/sos")
public class SosController {
    private final SosService sosService;

    public SosController(SosService sosService) {
        this.sosService = sosService;
    }

    @PostMapping
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
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getActiveSos() {
        String correlationId = UUID.randomUUID().toString();
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

                // Resolve police station details
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

                // Resolve timeline audit logs
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

            return ResponseEntity.ok(ApiResponse.success("Active emergency alerts retrieved", response, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error(e.getMessage(), "SOS_003", correlationId));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<SosAlert>>> getSosHistory() {
        String correlationId = UUID.randomUUID().toString();
        try {
            List<SosAlert> history = sosService.getSosHistory();
            return ResponseEntity.ok(ApiResponse.success("Historical resolved alerts retrieved", history, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error(e.getMessage(), "SOS_004", correlationId));
        }
    }

    @PostMapping("/{sosId}/acknowledge")
    public ResponseEntity<ApiResponse<SosAlert>> acknowledgeSos(
            @PathVariable String sosId,
            @RequestParam(defaultValue = "Admin Command Center") String adminUser,
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
    public ResponseEntity<ApiResponse<SosAlert>> resolveSos(
            @PathVariable String sosId,
            @RequestParam String remarks,
            @RequestParam(defaultValue = "Admin Command Center") String adminUser) {
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
