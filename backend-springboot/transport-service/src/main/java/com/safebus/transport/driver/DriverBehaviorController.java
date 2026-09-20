package com.safebus.transport.driver;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/v1/driver")
@Tag(name = "Driver Behavior", description = "Driver real-time webcam computer vision telemetry check APIs")
public class DriverBehaviorController {

    private final Map<String, Map<String, Object>> busBehaviors = new ConcurrentHashMap<>();
    private final RabbitTemplate rabbitTemplate;

    public DriverBehaviorController(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
        // Initialize default profiles
        busBehaviors.put("Bus 1", createDefaultBehavior());
        busBehaviors.put("TN38AB1234", createDefaultBehavior());
    }

    private Map<String, Object> createDefaultBehavior() {
        Map<String, Object> map = new ConcurrentHashMap<>();
        map.put("status", "UNKNOWN");
        map.put("confidence", 0.0);
        map.put("faceDetected", false);
        map.put("eyesClosed", false);
        map.put("ear", 0.0);
        map.put("mar", 0.0);
        map.put("phoneDetected", false);
        map.put("seatBelt", true);
        map.put("source", "REAL_CV");
        map.put("timestamp", "");
        map.put("drowsiness", false);
        map.put("yawning", false);
        map.put("distraction", false);
        map.put("mobileUsage", false);
        map.put("smoking", false);
        map.put("seatbelt", true);
        map.put("safetyScore", 95);
        map.put("speed", 0);
        return map;
    }

    @GetMapping("/behavior")
    @Operation(summary = "Get Driver Live Behavior", description = "Retrieve live cached metrics of driver drowsiness, distraction, yawning, mobile usage, and safety scores.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Driver behavior status retrieved successfully")
    })
    public ResponseEntity<?> getBehavior(
            @RequestParam(value = "busId", required = false) String busId) {
        if (busId != null && !busId.trim().isEmpty()) {
            return ResponseEntity.ok(busBehaviors.computeIfAbsent(busId, k -> createDefaultBehavior()));
        }
        return ResponseEntity.ok(busBehaviors);
    }

    @PostMapping("/behavior")
    @Operation(summary = "Post Driver Behavior Data", description = "Updates cache parameters of the live driver behavior monitors with values calculated by computer vision sensors.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Driver behavior status updated successfully")
    })
    public ResponseEntity<Map<String, Object>> postBehavior(
            @RequestParam(value = "busId", defaultValue = "Bus 1", required = false) String busId,
            @RequestBody Map<String, Object> payload) {
        
        Map<String, Object> behaviorCache = busBehaviors.computeIfAbsent(busId, k -> createDefaultBehavior());
        if (payload != null) {
            String[] keys = new String[]{
                "status", "confidence", "faceDetected", "eyesClosed", "ear", "mar", 
                "phoneDetected", "seatBelt", "source", "timestamp", "driverId", "busId", "routeId", "tripId",
                "drowsiness", "yawning", "distraction", "mobileUsage", "smoking", "seatbelt", "safetyScore", "speed"
            };
            for (String key : keys) {
                if (payload.containsKey(key)) {
                    behaviorCache.put(key, payload.get(key));
                }
            }

            // Ensure busId is set inside the telemetry map
            behaviorCache.put("busId", busId);

            // Publish telemetry to RabbitMQ for real-time WebSocket broadcast
            try {
                rabbitTemplate.convertAndSend("driver.exchange", "driver.telemetry", behaviorCache);
            } catch (Exception e) {
                System.err.println("[DriverBehaviorController] Failed to publish telemetry to RabbitMQ: " + e.getMessage());
            }
        }
        return ResponseEntity.ok(behaviorCache);
    }

}
