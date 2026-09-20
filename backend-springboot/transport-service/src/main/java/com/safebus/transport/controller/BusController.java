package com.safebus.transport.controller;

import com.safebus.common.dto.response.ApiResponse;
import com.safebus.transport.entity.Bus;
import com.safebus.transport.service.BusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping
@Tag(name = "Buses", description = "Bus fleet tracking, occupancy, active counts, and statistics query APIs")
public class BusController {
    private final BusService busService;

    public BusController(BusService busService) {
        this.busService = busService;
    }

    @GetMapping("/api/v1/buses")
    @Operation(summary = "Get All Buses", description = "Query detailed registration profile lists for all buses in the fleet.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Buses profiles list retrieved successfully")
    })
    public ResponseEntity<List<Bus>> getBuses() {
        return ResponseEntity.ok(busService.getAllBuses());
    }

    @PostMapping("/api/v1/buses")
    @Operation(summary = "Create Bus Profile", description = "Register a new vehicle with plate number and driver assignment metadata details.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Bus profile registered successfully")
    })
    public ResponseEntity<ApiResponse<Bus>> createBus(@RequestBody Bus bus) {
        Bus saved = busService.saveBus(bus);
        ApiResponse<Bus> res = ApiResponse.<Bus>builder()
                .success(true)
                .message("Bus created successfully")
                .data(saved)
                .build();
        return ResponseEntity.ok(res);
    }

    @PutMapping("/api/v1/buses/{id}")
    public ResponseEntity<ApiResponse<Bus>> updateBus(@PathVariable("id") String id, @RequestBody Bus bus) {
        bus.setId(id);
        Bus saved = busService.saveBus(bus);
        ApiResponse<Bus> res = ApiResponse.<Bus>builder()
                .success(true)
                .message("Bus updated successfully")
                .data(saved)
                .build();
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/api/v1/buses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBus(@PathVariable("id") String id) {
        busService.deleteBus(id);
        ApiResponse<Void> res = ApiResponse.<Void>builder()
                .success(true)
                .message("Bus deleted successfully")
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/count")
    public ResponseEntity<ApiResponse<Long>> getBusCount() {
        ApiResponse<Long> res = ApiResponse.<Long>builder()
                .success(true)
                .message("Total buses count retrieved")
                .data(busService.getBusCount())
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/statistics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBusStatistics() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalBuses", busService.getBusCount());
        stats.put("activeBuses", busService.getActiveBusesCount());
        stats.put("inactiveBuses", busService.getInactiveBusesCount());
        stats.put("totalOccupancy", busService.getTotalOccupancy());
        stats.put("averageSpeed", busService.getAverageSpeed());
        
        ApiResponse<Map<String, Object>> res = ApiResponse.<Map<String, Object>>builder()
                .success(true)
                .message("Bus statistics retrieved")
                .data(stats)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/occupancy")
    public ResponseEntity<ApiResponse<Integer>> getTotalOccupancy() {
        ApiResponse<Integer> res = ApiResponse.<Integer>builder()
                .success(true)
                .message("Total occupancy retrieved")
                .data(busService.getTotalOccupancy())
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/active")
    public ResponseEntity<ApiResponse<List<Bus>>> getActiveBuses() {
        List<Bus> active = busService.getAllBuses().stream()
                .filter(b -> !"Idle".equalsIgnoreCase(b.getStatus()))
                .toList();
        ApiResponse<List<Bus>> res = ApiResponse.<List<Bus>>builder()
                .success(true)
                .message("Active buses retrieved")
                .data(active)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/inactive")
    public ResponseEntity<ApiResponse<List<Bus>>> getInactiveBuses() {
        List<Bus> inactive = busService.getAllBuses().stream()
                .filter(b -> "Idle".equalsIgnoreCase(b.getStatus()))
                .toList();
        ApiResponse<List<Bus>> res = ApiResponse.<List<Bus>>builder()
                .success(true)
                .message("Inactive buses retrieved")
                .data(inactive)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/live")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLiveBuses() {
        List<Map<String, Object>> locations = getBusesLocation().getBody();
        ApiResponse<List<Map<String, Object>>> res = ApiResponse.<List<Map<String, Object>>>builder()
                .success(true)
                .message("Live buses coordinates retrieved")
                .data(locations)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/{id}/occupancy")
    public ResponseEntity<ApiResponse<Integer>> getBusOccupancy(@PathVariable("id") String id) {
        int occ = busService.getAllBuses().stream()
                .filter(b -> b.getId().equals(id))
                .mapToInt(Bus::getStudentsOnboard)
                .findFirst()
                .orElse(0);
        ApiResponse<Integer> res = ApiResponse.<Integer>builder()
                .success(true)
                .message("Bus occupancy retrieved")
                .data(occ)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/{id}/speed")
    public ResponseEntity<ApiResponse<Integer>> getBusSpeed(@PathVariable("id") String id) {
        int speed = busService.getAllBuses().stream()
                .filter(b -> b.getId().equals(id))
                .mapToInt(Bus::getSpeed)
                .findFirst()
                .orElse(0);
        ApiResponse<Integer> res = ApiResponse.<Integer>builder()
                .success(true)
                .message("Bus speed retrieved")
                .data(speed)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/{id}/eta")
    public ResponseEntity<ApiResponse<String>> getBusEta(@PathVariable("id") String id) {
        String eta = busService.getAllBuses().stream()
                .filter(b -> b.getId().equals(id))
                .map(Bus::getEta)
                .findFirst()
                .orElse("N/A");
        ApiResponse<String> res = ApiResponse.<String>builder()
                .success(true)
                .message("Bus ETA retrieved")
                .data(eta)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/{id}/route")
    public ResponseEntity<ApiResponse<String>> getBusRoute(@PathVariable("id") String id) {
        String route = busService.getAllBuses().stream()
                .filter(b -> b.getId().equals(id))
                .map(Bus::getRoute)
                .findFirst()
                .orElse("N/A");
        ApiResponse<String> res = ApiResponse.<String>builder()
                .success(true)
                .message("Bus route retrieved")
                .data(route)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/api/v1/buses/location")
    public ResponseEntity<List<Map<String, Object>>> getBusesLocation() {
        List<Bus> rows = busService.getAllBuses();
        List<Map<String, Object>> locations = new ArrayList<>();

        Map<String, String> idMapping = Map.of(
            "TN38AB1234", "Bus 1",
            "TN38CD5678", "Bus 2",
            "TN38EP9012", "Bus 3"
        );

        for (Bus row : rows) {
            String dbId = row.getId();
            String mappedId = idMapping.getOrDefault(dbId, dbId);

            Map<String, Object> loc = new HashMap<>();
            loc.put("id", mappedId);
            loc.put("name", row.getName());
            loc.put("latitude", row.getLatitude() != null ? row.getLatitude() : 10.8801);
            loc.put("longitude", row.getLongitude() != null ? row.getLongitude() : 77.0224);
            loc.put("speed", row.getSpeed());
            loc.put("heading", row.getSpeed() > 0 ? new Random().nextInt(360) : 0);
            loc.put("status", row.getStatus());
            loc.put("occupancy", row.getStudentsOnboard());
            loc.put("route", row.getRoute());
            loc.put("driverName", row.getDriver());

            locations.add(loc);
        }

        return ResponseEntity.ok(locations);
    }

    @PostMapping(value = {"/api/v1/telemetry", "/api/v1/buses/telemetry"})
    @Operation(summary = "Post Live Bus Telemetry GPS", description = "Updates live vehicle GPS coordinates, detects 2km geofence approaching alerts, and broadcasts coordinates over WebSocket.")
    public ResponseEntity<Map<String, Object>> postTelemetry(@RequestBody Map<String, Object> payload) {
        try {
            String busId = payload.get("busId") != null ? payload.get("busId").toString() : "TN38AB1234";
            double lat = Double.parseDouble(payload.get("latitude").toString());
            double lng = Double.parseDouble(payload.get("longitude").toString());
            int speed = payload.get("speed") != null ? (int) Math.round(Double.parseDouble(payload.get("speed").toString())) : 30;
            double accel = Double.parseDouble(payload.getOrDefault("acceleration", 0.0).toString());

            busService.processTelemetry(busId, lat, lng, speed, accel);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Telemetry processed and broadcast."));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    @PostMapping(value = {"/api/v1/telemetry/reset", "/api/v1/buses/{id}/reset-simulation"})
    @Operation(summary = "Reset Simulation Alert Cache", description = "Clears geofence 2km alert deduplication cache to allow re-testing of approaching alerts.")
    public ResponseEntity<Map<String, Object>> resetTelemetrySimulation(
            @PathVariable(value = "id", required = false) String id,
            @RequestParam(value = "busId", defaultValue = "TN38AB1234", required = false) String busIdParam) {
        String targetBus = id != null ? id : busIdParam;
        busService.resetTripDeduplication(targetBus);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Simulation trip alerts reset for bus " + targetBus));
    }
}
