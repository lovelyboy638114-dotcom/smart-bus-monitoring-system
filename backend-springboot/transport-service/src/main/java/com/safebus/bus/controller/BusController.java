package com.safebus.bus.controller;

import com.safebus.bus.entity.Bus;
import com.safebus.bus.service.BusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping
public class BusController {
    private final BusService busService;

    public BusController(BusService busService) {
        this.busService = busService;
    }

    @GetMapping("/api/v1/buses")
    public ResponseEntity<List<Bus>> getBuses() {
        return ResponseEntity.ok(busService.getAllBuses());
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

            locations.add(loc);
        }

        return ResponseEntity.ok(locations);
    }

    @PostMapping("/api/v1/telemetry")
    public ResponseEntity<Map<String, Object>> postTelemetry(@RequestBody Map<String, Object> payload) {
        try {
            String busId = (String) payload.get("busId");
            double lat = Double.parseDouble(payload.get("latitude").toString());
            double lng = Double.parseDouble(payload.get("longitude").toString());
            int speed = Integer.parseInt(payload.get("speed").toString());
            double accel = Double.parseDouble(payload.getOrDefault("acceleration", 0.0).toString());

            busService.processTelemetry(busId, lat, lng, speed, accel);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Telemetry processed."));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(Map.of("status", "error", "message", e.getMessage()));
        }
    }
}
