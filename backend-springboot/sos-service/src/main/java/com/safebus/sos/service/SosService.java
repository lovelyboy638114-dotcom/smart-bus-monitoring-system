package com.safebus.sos.service;

import com.safebus.sos.entity.*;
import com.safebus.sos.repository.*;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class SosService {

    private final SosAlertRepository alertRepository;
    private final SosAuditLogRepository auditLogRepository;
    private final PoliceStationRepository policeStationRepository;
    private final RabbitTemplate rabbitTemplate;

    public SosService(SosAlertRepository alertRepository,
                      SosAuditLogRepository auditLogRepository,
                      PoliceStationRepository policeStationRepository,
                      RabbitTemplate rabbitTemplate) {
        this.alertRepository = alertRepository;
        this.auditLogRepository = auditLogRepository;
        this.policeStationRepository = policeStationRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    private String generateSosId() {
        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long count = alertRepository.countByCreatedAtGreaterThanEqual(startOfDay);
        return String.format("SOS%s%04d", todayStr, count + 1);
    }

    @Transactional
    public SosAlert createSos(Map<String, Object> req) {
        String busId = (String) req.get("busId");
        double lat = Double.parseDouble(req.get("latitude").toString());
        double lng = Double.parseDouble(req.get("longitude").toString());
        int speed = Integer.parseInt(req.getOrDefault("speed", "0").toString());
        String route = (String) req.getOrDefault("route", "Unknown Route");
        String emergencyType = (String) req.getOrDefault("emergency_type", "General Emergency");
        String driverId = (String) req.getOrDefault("driver_id", "driver@happyjourney.ai");
        String driverName = (String) req.getOrDefault("driver_name", "Unknown Driver");
        boolean isTest = Boolean.parseBoolean(req.getOrDefault("is_test", "false").toString());
        String severityVal = (String) req.getOrDefault("severity", "CRITICAL");

        // 1. Duplication Check
        List<SosStatus> activeStatuses = List.of(SosStatus.CREATED, SosStatus.POLICE_NOTIFIED, SosStatus.ADMIN_ACKNOWLEDGED);
        Optional<SosAlert> activeAlert = alertRepository.findActiveByBusId(busId, activeStatuses);
        if (activeAlert.isPresent()) {
            throw new IllegalArgumentException("SOS alert already active for bus " + busId);
        }

        // 2. Rate Limiting Check (30 seconds)
        LocalDateTime thirtySecondsAgo = LocalDateTime.now().minusSeconds(30);
        List<SosAlert> recentAlerts = alertRepository.findRecentByBusId(busId, thirtySecondsAgo);
        if (!recentAlerts.isEmpty()) {
            throw new IllegalArgumentException("Rate limit exceeded. Try again shortly.");
        }

        String sosId = generateSosId();

        // 3. Build & Save Alert Entity
        SosAlert alert = SosAlert.builder()
                .sosId(sosId)
                .busId(busId)
                .driverId(driverId)
                .driverName(driverName)
                .latitude(lat)
                .longitude(lng)
                .speed(speed)
                .routeName(route)
                .emergencyType(emergencyType)
                .status(SosStatus.CREATED)
                .severity(SosSeverity.valueOf(severityVal))
                .isTest(isTest)
                .parentNotified(false)
                .adminNotified(false)
                .createdAt(LocalDateTime.now())
                .build();

        alertRepository.save(alert);

        // Log Audit
        logAudit(sosId, "Emergency Created", driverName, "Driver triggered Emergency SOS: [" + emergencyType + "]", null, null, null);

        // Enqueue Admin notification via RabbitMQ
        Map<String, Object> adminMsg = new HashMap<>();
        adminMsg.put("sos_id", sosId);
        adminMsg.put("type", "ADMIN");
        adminMsg.put("payload", Map.of(
                "busId", busId,
                "driverName", driverName,
                "latitude", lat,
                "longitude", lng,
                "speed", speed,
                "route", route,
                "time", LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm:ss a")),
                "severity", severityVal
        ));
        rabbitTemplate.convertAndSend("sos-exchange", "sos.event.alert", adminMsg);

        // 4. Locate Closest Police Station using Haversine
        List<PoliceStation> stations = policeStationRepository.findAll();
        PoliceStation closestStation = null;
        double minDistance = Double.MAX_VALUE;

        for (PoliceStation station : stations) {
            double dist = calculateDistance(lat, lng, station.getLatitude(), station.getLongitude());
            if (dist < minDistance) {
                minDistance = dist;
                closestStation = station;
            }
        }

        if (closestStation != null) {
            alert.setPoliceStationId(closestStation.getId());
            alert.setStatus(SosStatus.POLICE_NOTIFIED);
            alertRepository.save(alert);

            logAudit(sosId, "Nearest Police Identified", "System Router",
                    String.format("Nearest station: '%s' identified at %.2fkm.", closestStation.getStationName(), minDistance), null, null, null);

            // Enqueue Police notification via RabbitMQ
            String mapsLink = String.format("https://www.openstreetmap.org/?mlat=%f&mlon=%f#map=17/%f/%f", lat, lng, lat, lng);
            Map<String, Object> policeMsg = new HashMap<>();
            policeMsg.put("sos_id", sosId);
            policeMsg.put("type", "POLICE");
            policeMsg.put("payload", Map.of(
                    "station_name", closestStation.getStationName(),
                    "phone", closestStation.getPhone(),
                    "email", closestStation.getEmail() != null ? closestStation.getEmail() : "",
                    "maps_link", mapsLink,
                    "busId", busId,
                    "driverName", driverName,
                    "latitude", lat,
                    "longitude", lng,
                    "time", LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm:ss a"))
            ));
            rabbitTemplate.convertAndSend("sos-exchange", "sos.event.alert", policeMsg);
            logAudit(sosId, "Police Notification Enqueued", "System Router", "Police dispatch task added to RabbitMQ broker.", null, null, null);
        }

        return alert;
    }

    @Transactional
    public SosAlert acknowledgeSos(String sosId, String adminUser, String ip, String userAgent, String device) {
        SosAlert alert = alertRepository.findActiveByBusId(null, List.of(SosStatus.CREATED, SosStatus.POLICE_NOTIFIED))
                .orElse(alertRepository.findAll().stream()
                        .filter(a -> a.getSosId().equals(sosId) && a.getDeletedAt() == null)
                        .findFirst()
                        .orElseThrow(() -> new NoSuchElementException("Active SOS Alert " + sosId + " not found.")));

        alert.setStatus(SosStatus.ADMIN_ACKNOWLEDGED);
        alert.setAcknowledgedBy(adminUser);
        alert.setAcknowledgedAt(LocalDateTime.now());
        alertRepository.save(alert);

        logAudit(sosId, "Admin Acknowledged", adminUser,
                String.format("Admin acknowledged emergency from IP=%s, UA=%s, Device=%s.", ip, userAgent, device), ip, userAgent, device);

        // Enqueue parent notifications
        Map<String, Object> parentMsg = new HashMap<>();
        parentMsg.put("sos_id", sosId);
        parentMsg.put("type", "PARENT");
        parentMsg.put("payload", Map.of(
                "parent_name", "Mock Parent",
                "phone", "+91 98450 12303",
                "message", "The school has reported an emergency involving your child's bus " + alert.getBusId() + ". Authorities have been informed. Please wait for official updates."
        ));
        rabbitTemplate.convertAndSend("sos-exchange", "sos.event.alert", parentMsg);

        return alert;
    }

    @Transactional
    public SosAlert resolveSos(String sosId, String adminUser, String remarks) {
        if (remarks == null || remarks.trim().isEmpty()) {
            throw new IllegalArgumentException("Remarks are required to resolve an active SOS emergency.");
        }

        SosAlert alert = alertRepository.findAll().stream()
                .filter(a -> a.getSosId().equals(sosId) && a.getDeletedAt() == null)
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("SOS Alert " + sosId + " not found."));

        alert.setStatus(SosStatus.RESOLVED);
        alert.setResolvedBy(adminUser);
        alert.setResolvedAt(LocalDateTime.now());
        alert.setRemarks(remarks);
        alertRepository.save(alert);

        logAudit(sosId, "Admin Resolved", adminUser, "Incident resolved. Remarks: '" + remarks + "'", null, null, null);
        return alert;
    }

    public List<SosAlert> getActiveSos() {
        return alertRepository.findByStatusInAndDeletedAtIsNull(
                List.of(SosStatus.CREATED, SosStatus.POLICE_NOTIFIED, SosStatus.ADMIN_ACKNOWLEDGED));
    }

    public List<SosAlert> getSosHistory() {
        return alertRepository.findByStatusAndDeletedAtIsNullOrderByResolvedAtDesc(SosStatus.RESOLVED);
    }

    public List<SosAuditLog> getTimeline(String sosId) {
        return auditLogRepository.findBySosIdOrderByTimestampAsc(sosId);
    }

    public PoliceStation getPoliceStation(Integer id) {
        if (id == null) return null;
        return policeStationRepository.findById(id).orElse(null);
    }

    public void logAudit(String sosId, String action, String performedBy, String remarks, String ip, String ua, String dev) {
        SosAuditLog log = SosAuditLog.builder()
                .sosId(sosId)
                .action(action)
                .performedBy(performedBy)
                .timestamp(LocalDateTime.now())
                .remarks(remarks)
                .ipAddress(ip)
                .userAgent(ua)
                .device(dev)
                .build();
        auditLogRepository.save(log);
    }

    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
