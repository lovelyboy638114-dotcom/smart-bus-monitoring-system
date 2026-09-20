package com.safebus.transport.driver;

import com.safebus.common.dto.response.ApiResponse;
import org.springframework.http.HttpStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/driver/incidents")
@Tag(name = "Driver Incidents", description = "Driver emergency warning incidents (drowsiness, yawning, seatbelt) log and resolution APIs")
public class DriverIncidentController {
    private final DriverIncidentService incidentService;

    @Value("${cv.confidence-threshold:0.80}")
    private double confidenceThreshold;

    public DriverIncidentController(DriverIncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    @Operation(summary = "Record Driver Incident", description = "Queues a new warning event (base64 image extraction, AI confidence indicators) for asynchronous processing.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "202", description = "Incident registered successfully (accepted for async queuing)")
    })
    public ResponseEntity<ApiResponse<Long>> recordIncident(@RequestBody Map<String, Object> req) {
        String driverId = (String) req.getOrDefault("driverId", "UnknownDriver");
        String busId = (String) req.getOrDefault("busId", "UnknownBus");
        String routeId = (String) req.get("routeId");
        String tripId = (String) req.get("tripId");
        String incidentType = (String) req.getOrDefault("incidentType", "NORMAL");
        Double confidence = Double.valueOf(req.getOrDefault("confidence", 1.0).toString());

        // Centralized Server-Side Safety Validation Gates
        if ("UNKNOWN".equalsIgnoreCase(incidentType) || "NORMAL".equalsIgnoreCase(incidentType)) {
            System.err.println("[DriverIncidentController] Rejected raw status log. Type: " + incidentType);
            return ResponseEntity.badRequest().body(
                ApiResponse.<Long>builder()
                    .success(false)
                    .message("Server-side validation failed: UNKNOWN or NORMAL states cannot generate warning incidents.")
                    .build()
            );
        }

        if (confidence < confidenceThreshold) {
            System.err.println("[DriverIncidentController] Rejected low confidence log. Confidence: " + confidence + " < " + confidenceThreshold);
            return ResponseEntity.badRequest().body(
                ApiResponse.<Long>builder()
                    .success(false)
                    .message("Server-side validation failed: Confidence score " + confidence + " is below minimum threshold of " + confidenceThreshold)
                    .build()
            );
        }
        String imageBase64 = (String) req.get("imageBase64");
        Double latitude = req.get("latitude") != null ? Double.valueOf(req.get("latitude").toString()) : null;
        Double longitude = req.get("longitude") != null ? Double.valueOf(req.get("longitude").toString()) : null;
        Double speed = req.get("speed") != null ? Double.valueOf(req.get("speed").toString()) : null;

        Long incidentId = incidentService.recordIncident(
                driverId, busId, routeId, tripId, incidentType, confidence, imageBase64, latitude, longitude, speed
        );

        ApiResponse<Long> res = ApiResponse.<Long>builder()
                .success(true)
                .message("Incident recorded successfully (Asynchronous processing enqueued)")
                .data(incidentId)
                .build();
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(res);
    }

    @GetMapping
    @Operation(summary = "Get All Driver Incidents", description = "Query detailed information of registered driver alerts logs (including drowsiness, distractions, phone usage, resolution states).")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Driver incidents retrieved successfully")
    })
    public ResponseEntity<ApiResponse<List<DriverIncident>>> getAllIncidents() {
        List<DriverIncident> list = incidentService.getAllIncidents();
        ApiResponse<List<DriverIncident>> res = ApiResponse.<List<DriverIncident>>builder()
                .success(true)
                .message("Incidents retrieved successfully")
                .data(list)
                .build();
        return ResponseEntity.ok(res);
    }

    @PutMapping("/{id}/resolve")
    @Operation(summary = "Resolve Driver Warning Incident", description = "Enables command dispatchers to resolve warning indicators by specifying username resolvers.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Incident resolved successfully")
    })
    public ResponseEntity<ApiResponse<Void>> resolveIncident(
            @Parameter(description = "Registered incident record sequence ID", example = "42") @PathVariable Long id,
            @Parameter(description = "Name of the admin resolver", example = "Admin Center") @RequestParam String resolvedBy) {
        incidentService.resolveIncident(id, resolvedBy);
        ApiResponse<Void> res = ApiResponse.<Void>builder()
                .success(true)
                .message("Incident resolved successfully")
                .build();
        return ResponseEntity.ok(res);
    }
}
