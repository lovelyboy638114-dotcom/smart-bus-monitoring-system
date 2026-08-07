package com.safebus.transport.assignment;

import com.safebus.transport.entity.*;
import com.safebus.transport.repository.*;
import com.safebus.transport.geocoding.GeocodingService;
import com.safebus.common.dto.StudentDto;
import com.safebus.common.dto.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class BusAssignmentService {
    private static final Logger log = LoggerFactory.getLogger(BusAssignmentService.class);

    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final StopRepository stopRepository;
    private final AlertRepository alertRepository;
    private final GeocodingService geocodingService;
    private final DistanceService distanceService;
    private final RestTemplate restTemplate;

    public BusAssignmentService(BusRepository busRepository,
                                RouteRepository routeRepository,
                                StopRepository stopRepository,
                                AlertRepository alertRepository,
                                GeocodingService geocodingService,
                                DistanceService distanceService,
                                RestTemplate restTemplate) {
        this.busRepository = busRepository;
        this.routeRepository = routeRepository;
        this.stopRepository = stopRepository;
        this.alertRepository = alertRepository;
        this.geocodingService = geocodingService;
        this.distanceService = distanceService;
        this.restTemplate = restTemplate;
    }

    @Transactional
    public boolean assignBusToStudent(String studentId) {
        log.info("[BusAssignment] Initiating automatic assignment for student: {}", studentId);

        // Step 1: Call student-service via REST to get student data
        StudentDto student = null;
        try {
            String studentUrl = "http://student-service/api/v1/students/" + studentId;
            ApiResponse<?> response = restTemplate.getForObject(studentUrl, ApiResponse.class);
            if (response != null && response.isSuccess()) {
                // Map the response data object to StudentDto
                Map<?, ?> dataMap = (Map<?, ?>) response.getData();
                student = StudentDto.builder()
                        .id((String) dataMap.get("id"))
                        .name((String) dataMap.get("name"))
                        .address((String) dataMap.get("address"))
                        .build();
            }
        } catch (Exception e) {
            log.error("[BusAssignment] Failed to retrieve student details: {}", e.getMessage());
            logAdminAlert("Failed to retrieve details for student ID: " + studentId, "High");
            return false;
        }

        if (student == null) {
            log.warn("[BusAssignment] Student not found with ID: {}", studentId);
            return false;
        }

        // Step 2: Validate address
        if (student.getAddress() == null || student.getAddress().trim().isEmpty()) {
            log.warn("[BusAssignment] Address is empty. Setting status to BUS_PENDING.");
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("Student " + student.getName() + " (" + student.getId() + ") has no address specified. Manual assignment required.", "Medium");
            return false;
        }

        // Step 3: Geocode address
        double[] coords = geocodingService.geocode(student.getAddress());
        if (coords == null) {
            log.warn("[BusAssignment] Geocoding failed. Setting status to BUS_PENDING.");
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("Geocoding failed for Student " + student.getName() + " (" + student.getId() + ") address: '" + student.getAddress() + "'. Manual review required.", "Medium");
            return false;
        }

        double stuLat = coords[0];
        double stuLng = coords[1];

        // Step 4: Load active pickup stops
        List<Stop> stops = stopRepository.findAll();
        if (stops.isEmpty()) {
            log.warn("[BusAssignment] No stops configured in database. Setting status to BUS_PENDING.");
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("No database stops found for automatic assignment of student " + student.getName() + ".", "High");
            return false;
        }

        // Step 5: Find nearest stop
        Stop nearestStop = null;
        double minDistance = Double.MAX_VALUE;

        for (Stop stop : stops) {
            double distance = distanceService.haversineDistanceMeters(stuLat, stuLng, stop.getLatitude(), stop.getLongitude());
            if (distance < minDistance) {
                minDistance = distance;
                nearestStop = stop;
            }
        }

        if (nearestStop == null || nearestStop.getRouteId() == null || nearestStop.getRouteId().isEmpty()) {
            log.warn("[BusAssignment] Nearest stop is invalid or not mapped to a route. Setting status to BUS_PENDING.");
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("Nearest stop for Student " + student.getName() + " is not mapped to any route.", "High");
            return false;
        }

        log.info("[BusAssignment] Nearest stop identified: '{}' ({} m away) on Route: '{}'", 
                 nearestStop.getName(), String.format("%.1f", minDistance), nearestStop.getRouteId());

        // Step 6: Load active buses serving that route
        String routeId = nearestStop.getRouteId();
        List<Bus> buses = busRepository.findByRouteAndStatus(routeId, "Active");
        // Fallback: If no "Active" buses found, fetch by routeId
        if (buses.isEmpty()) {
            buses = busRepository.findByRoute(routeId);
        }

        if (buses.isEmpty()) {
            log.warn("[BusAssignment] No active buses found serving route '{}'. Setting status to BUS_PENDING.", routeId);
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("No active buses available on Route '" + routeId + "' for student " + student.getName() + ".", "High");
            return false;
        }

        // Step 7: Sort buses by capacity availability and lowest occupancy
        List<BusOccupancy> busOccupancies = new ArrayList<>();
        for (Bus bus : buses) {
            long occupancy = 0;
            try {
                String countUrl = "http://student-service/api/v1/students/assigned-count?busId=" + bus.getId();
                ApiResponse<?> countResponse = restTemplate.getForObject(countUrl, ApiResponse.class);
                if (countResponse != null && countResponse.isSuccess()) {
                    occupancy = Long.parseLong(countResponse.getData().toString());
                }
            } catch (Exception e) {
                log.error("[BusAssignment] Failed to fetch student count for bus {}: {}", bus.getId(), e.getMessage());
            }

            int capacity = bus.getMaxSpeed() > 0 ? 40 : 40; // Default capacity to 40
            boolean hasCapacity = occupancy < capacity;
            busOccupancies.add(new BusOccupancy(bus, occupancy, hasCapacity));
        }

        busOccupancies.sort((a, b) -> {
            if (a.hasCapacity != b.hasCapacity) {
                return Boolean.compare(!a.hasCapacity, !b.hasCapacity);
            }
            return Long.compare(a.occupancy, b.occupancy);
        });

        Bus selectedBus = null;
        for (BusOccupancy item : busOccupancies) {
            if (item.hasCapacity) {
                selectedBus = item.bus;
                break;
            }
        }

        // Step 8: Assign Bus & Update student-service
        if (selectedBus != null) {
            boolean success = updateStudentStatus(studentId, selectedBus.getId(), "Assigned");
            if (success) {
                log.info("[BusAssignment] Successfully assigned Student '{}' to Bus '{}' at Stop '{}'", 
                         student.getName(), selectedBus.getId(), nearestStop.getName());
                return true;
            } else {
                log.error("[BusAssignment] Failed to commit assignment status in student-service.");
                return false;
            }
        } else {
            log.warn("[BusAssignment] All buses serving Route '{}' are at capacity. Setting status to BUS_PENDING.", routeId);
            updateStudentStatus(studentId, "", "BUS_PENDING");
            logAdminAlert("Bus Assignment Failure: Route '" + routeId + "' buses are full. Student " + student.getName() + " is pending.", "High");
            return false;
        }
    }

    private boolean updateStudentStatus(String studentId, String busId, String status) {
        try {
            String updateUrl = "http://student-service/api/v1/students/" + studentId + "/assign-bus?busId=" + busId + "&status=" + status;
            restTemplate.put(updateUrl, null);
            return true;
        } catch (Exception e) {
            log.error("[BusAssignment] REST update to student-service failed: {}", e.getMessage());
            return false;
        }
    }

    private void logAdminAlert(String message, String severity) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("hh:mm a");
        Alert alert = Alert.builder()
                .type("Auto Bus Assignment")
                .severity(severity)
                .bus(null)
                .driver("System")
                .time(LocalDateTime.now().format(dtf))
                .resolved(0)
                .build();
        alertRepository.save(alert);
    }

    private static class BusOccupancy {
        final Bus bus;
        final long occupancy;
        final boolean hasCapacity;

        BusOccupancy(Bus bus, long occupancy, boolean hasCapacity) {
            this.bus = bus;
            this.occupancy = occupancy;
            this.hasCapacity = hasCapacity;
        }
    }
}
