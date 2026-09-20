package com.safebus.transport.service;

import com.safebus.transport.assignment.DistanceService;
import com.safebus.transport.entity.Alert;
import com.safebus.transport.entity.Bus;
import com.safebus.transport.entity.TelemetryLog;
import com.safebus.transport.repository.AlertRepository;
import com.safebus.transport.repository.BusRepository;
import com.safebus.transport.repository.TelemetryLogRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BusService {
    private final BusRepository busRepository;
    private final TelemetryLogRepository telemetryLogRepository;
    private final AlertRepository alertRepository;
    private final DistanceService distanceService;
    private final RabbitTemplate rabbitTemplate;
    private final JdbcTemplate jdbcTemplate;

    // Deduplication cache for 2km geofence approaching alerts (Key: busId + "-" + studentId + "-2km")
    private final Set<String> triggeredApproachingAlerts = ConcurrentHashMap.newKeySet();

    public BusService(BusRepository busRepository,
                      TelemetryLogRepository telemetryLogRepository,
                      AlertRepository alertRepository,
                      DistanceService distanceService,
                      RabbitTemplate rabbitTemplate,
                      JdbcTemplate jdbcTemplate) {
        this.busRepository = busRepository;
        this.telemetryLogRepository = telemetryLogRepository;
        this.alertRepository = alertRepository;
        this.distanceService = distanceService;
        this.rabbitTemplate = rabbitTemplate;
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Bus> getAllBuses() {
        return busRepository.findAll();
    }

    @Transactional
    public void processTelemetry(String rawBusId, double latitude, double longitude, int speed, double acceleration) {
        String busId = normalizeBusId(rawBusId);

        // 1. Log incoming telemetry
        TelemetryLog log = TelemetryLog.builder()
                .busId(busId)
                .latitude(latitude)
                .longitude(longitude)
                .speed(speed)
                .acceleration(acceleration)
                .build();
        telemetryLogRepository.save(log);

        // 2. Fetch active bus
        Optional<Bus> busOpt = busRepository.findById(busId);
        if (busOpt.isPresent()) {
            Bus bus = busOpt.get();
            bus.setSpeed(speed);
            bus.setLatitude(latitude);
            bus.setLongitude(longitude);
            bus.setStatus("Running");

            // 3. Speed Limit check
            if (speed > bus.getMaxSpeed()) {
                triggerAlert("Overspeeding Detected", "High", busId, bus.getDriver());
            }

            // 4. Deceleration check
            if (acceleration < -3.0) {
                triggerAlert("Harsh Braking Detected", "Medium", busId, bus.getDriver());
            }

            busRepository.save(bus);
        }

        // 5. Broadcast live bus coordinates via RabbitMQ for WebSocket stream
        try {
            Map<String, Object> liveLocation = new HashMap<>();
            liveLocation.put("type", "BUS_LOCATION");
            liveLocation.put("busId", busId);
            liveLocation.put("rawBusId", rawBusId);
            liveLocation.put("latitude", latitude);
            liveLocation.put("longitude", longitude);
            liveLocation.put("speed", speed);
            liveLocation.put("status", "Running");
            liveLocation.put("timestamp", LocalDateTime.now().toString());

            rabbitTemplate.convertAndSend("driver.exchange", "bus.location.update", liveLocation);
        } catch (Exception e) {
            System.err.println("[BusService] Failed to publish bus location to RabbitMQ: " + e.getMessage());
        }

        // 6. Proximity & 2 KM Approaching Geofence check against assigned student stops
        checkStudentStopProximity(busId, latitude, longitude, speed);
    }

    private void checkStudentStopProximity(String busId, double latitude, double longitude, int speed) {
        try {
            String sql = "SELECT s.id as student_id, s.name as student_name, " +
                    "COALESCE(st.name, 'Gandhipuram Bus Stand') as stop_name, " +
                    "COALESCE(st.latitude, 11.0168) as stop_lat, " +
                    "COALESCE(st.longitude, 76.9674) as stop_lng, " +
                    "COALESCE(p.phone, s.parent_phone, '9876543210') as parent_phone " +
                    "FROM students s " +
                    "LEFT JOIN stops st ON s.pickup_stop_id = st.id " +
                    "LEFT JOIN parents p ON s.parent_id = p.id " +
                    "WHERE s.bus_id = ? OR s.bus_id = ? OR s.bus_id = ?";

            String altId1 = busId.equals("TN38AB1234") ? "Bus 1" : busId.equals("TN38CD5678") ? "Bus 2" : "Bus 3";
            String altId2 = busId.equals("TN38AB1234") ? "1" : busId.equals("TN38CD5678") ? "2" : "3";

            List<Map<String, Object>> students = jdbcTemplate.queryForList(sql, busId, altId1, altId2);

            for (Map<String, Object> student : students) {
                String studentId = String.valueOf(student.get("student_id"));
                String studentName = (String) student.get("student_name");
                String stopName = (String) student.get("stop_name");
                double stopLat = Double.parseDouble(student.get("stop_lat").toString());
                double stopLng = Double.parseDouble(student.get("stop_lng").toString());
                String parentPhone = (String) student.get("parent_phone");

                double distKm = distanceService.haversineDistanceMeters(latitude, longitude, stopLat, stopLng) / 1000.0;

                // 2 KM Approaching Threshold: between 0.05 km and 2.15 km
                if (distKm <= 2.15 && distKm >= 0.05) {
                    String dedupeKey = busId + "-" + studentId + "-2km-" + stopName;
                    if (triggeredApproachingAlerts.add(dedupeKey)) {
                        int speedKmh = Math.max(speed, 24); // Realistic speed assumption for ETA
                        int etaMinutes = Math.max(1, (int) Math.round((distKm / (double) speedKmh) * 60.0));

                        System.out.println(String.format("[BusService] 🎯 2 KM Geofence Triggered! Bus: %s, Student: %s, Stop: %s, Dist: %.2f km, ETA: %d mins",
                                busId, studentName, stopName, distKm, etaMinutes));

                        Map<String, Object> alertPayload = new HashMap<>();
                        alertPayload.put("type", "BUS_APPROACHING");
                        alertPayload.put("busId", busId);
                        alertPayload.put("studentId", studentId);
                        alertPayload.put("studentName", studentName);
                        alertPayload.put("stopName", stopName);
                        alertPayload.put("parentPhone", parentPhone);
                        alertPayload.put("distanceKm", distKm);
                        alertPayload.put("etaMinutes", etaMinutes);
                        alertPayload.put("timestamp", LocalDateTime.now().toString());

                        rabbitTemplate.convertAndSend("driver.exchange", "bus.location.alert", alertPayload);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[BusService] Proximity check error: " + e.getMessage());
        }
    }

    public void resetTripDeduplication(String busId) {
        String normalized = normalizeBusId(busId);
        triggeredApproachingAlerts.removeIf(key -> key.startsWith(normalized) || (busId != null && key.startsWith(busId)));
        System.out.println("[BusService] Cleared 2km approaching deduplication cache for bus " + normalized);
    }

    private String normalizeBusId(String raw) {
        if (raw == null) return "TN38AB1234";
        String trimmed = raw.trim();
        if ("1".equals(trimmed) || "Bus 1".equalsIgnoreCase(trimmed) || "TN38AB1234".equalsIgnoreCase(trimmed)) {
            return "TN38AB1234";
        }
        if ("2".equals(trimmed) || "Bus 2".equalsIgnoreCase(trimmed) || "TN38CD5678".equalsIgnoreCase(trimmed)) {
            return "TN38CD5678";
        }
        if ("3".equals(trimmed) || "Bus 3".equalsIgnoreCase(trimmed) || "TN38EP9012".equalsIgnoreCase(trimmed)) {
            return "TN38EP9012";
        }
        return trimmed;
    }

    private void triggerAlert(String type, String severity, String busId, String driverName) {
        Optional<Alert> activeAlert = alertRepository.findByTypeAndBusAndResolved(type, busId, 0);
        if (activeAlert.isEmpty()) {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("hh:mm a");
            Alert alert = Alert.builder()
                    .type(type)
                    .severity(severity)
                    .bus(busId)
                    .driver(driverName != null ? driverName : "Unknown Driver")
                    .time(LocalDateTime.now().format(dtf))
                    .resolved(0)
                    .build();
            alertRepository.save(alert);
        }
    }

    public long getBusCount() {
        return busRepository.count();
    }

    public long getActiveBusesCount() {
        return busRepository.findAll().stream()
                .filter(b -> !"Idle".equalsIgnoreCase(b.getStatus()))
                .count();
    }

    public long getInactiveBusesCount() {
        return busRepository.findAll().stream()
                .filter(b -> "Idle".equalsIgnoreCase(b.getStatus()))
                .count();
    }

    public int getTotalOccupancy() {
        return busRepository.findAll().stream()
                .mapToInt(Bus::getStudentsOnboard)
                .sum();
    }

    public double getAverageSpeed() {
        return busRepository.findAll().stream()
                .mapToDouble(Bus::getSpeed)
                .average()
                .orElse(0.0);
    }

    @Transactional
    public Bus saveBus(Bus bus) {
        return busRepository.save(bus);
    }

    @Transactional
    public void deleteBus(String id) {
        busRepository.deleteById(id);
    }
}
