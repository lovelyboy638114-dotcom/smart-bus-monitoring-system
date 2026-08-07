package com.safebus.assignment.service;

import com.safebus.assignment.entity.*;
import com.safebus.assignment.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class BusAssignmentService {
    private final StudentAssignmentRepository studentRepository;
    private final BusAssignmentRepository busRepository;
    private final RouteAssignmentRepository routeRepository;
    private final StopAssignmentRepository stopRepository;
    private final AlertAssignmentRepository alertRepository;
    private final GeocodingService geocodingService;
    private final DistanceService distanceService;

    public BusAssignmentService(StudentAssignmentRepository studentRepository,
                                BusAssignmentRepository busRepository,
                                RouteAssignmentRepository routeRepository,
                                StopAssignmentRepository stopRepository,
                                AlertAssignmentRepository alertRepository,
                                GeocodingService geocodingService,
                                DistanceService distanceService) {
        this.studentRepository = studentRepository;
        this.busRepository = busRepository;
        this.routeRepository = routeRepository;
        this.stopRepository = stopRepository;
        this.alertRepository = alertRepository;
        this.geocodingService = geocodingService;
        this.distanceService = distanceService;
    }

    @Transactional
    public boolean assignBusToStudent(String studentId) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found with ID: " + studentId);
        }

        Student student = studentOpt.get();
        System.out.println("[BusAssignment] Initiating automatic assignment for student: " + student.getName() + " (" + student.getId() + ")");

        // Step 1: Validate address
        if (student.getAddress() == null || student.getAddress().trim().isEmpty()) {
            System.out.println("[BusAssignment] Address is empty. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("Student " + student.getName() + " (" + student.getId() + ") has no address specified. Manual assignment required.", "Medium");
            return false;
        }

        // Step 2: Geocode address
        double[] coords = geocodingService.geocode(student.getAddress());
        if (coords == null) {
            System.out.println("[BusAssignment] Geocoding failed for address. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("Geocoding failed for Student " + student.getName() + " (" + student.getId() + ") address: '" + student.getAddress() + "'. Manual review required.", "Medium");
            return false;
        }

        double stuLat = coords[0];
        double stuLng = coords[1];

        // Step 3: Load active pickup stops
        List<Stop> stops = stopRepository.findAll();
        if (stops.isEmpty()) {
            System.out.println("[BusAssignment] No stops configured in database. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("No database stops found for automatic assignment of student " + student.getName() + ".", "High");
            return false;
        }

        // Step 4 & 5: Find nearest stop
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
            System.out.println("[BusAssignment] Nearest stop is invalid or not mapped to a route. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("Nearest stop for Student " + student.getName() + " is not mapped to any route.", "High");
            return false;
        }

        System.out.println("[BusAssignment] Nearest stop identified: '" + nearestStop.getName() + "' (" + String.format("%.1f", minDistance) + " m away) on Route: '" + nearestStop.getRouteId() + "'");

        // Step 6 & 7: Resolve Route and Load active buses serving that route
        String routeId = nearestStop.getRouteId();
        List<Bus> buses = busRepository.findByRouteIdAndIsActive(routeId, true);
        if (buses.isEmpty()) {
            System.out.println("[BusAssignment] No active buses found serving route '" + routeId + "'. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("No active buses available on Route '" + routeId + "' for student " + student.getName() + ".", "High");
            return false;
        }

        // Step 8: Sort buses by capacity availability and lowest occupancy
        List<BusOccupancy> busOccupancies = new ArrayList<>();
        for (Bus bus : buses) {
            long occupancy = studentRepository.countByBusIdAndStudentStatus(bus.getId(), "ACTIVE");
            int capacity = bus.getCapacity() > 0 ? bus.getCapacity() : 40;
            boolean hasCapacity = occupancy < capacity;
            busOccupancies.add(new BusOccupancy(bus, occupancy, hasCapacity));
        }

        // Sort: Has capacity first (boolean true first), then lowest occupancy (int asc)
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

        // Step 9: Assign Bus & Update database fields
        if (selectedBus != null) {
            student.setBusId(selectedBus.getId());
            student.setRouteId(routeId);
            student.setPickupStopId(String.valueOf(nearestStop.getId()));
            student.setPickupDistance(minDistance);
            student.setAssignmentStatus("ASSIGNED");
            student.setStatus("Not Started");
            student.setAssignedAt(LocalDateTime.now());
            studentRepository.save(student);
            System.out.println("[BusAssignment] Successfully assigned Student '" + student.getName() + "' to Bus '" + selectedBus.getId() + "' at Stop '" + nearestStop.getName() + "'");
            return true;
        } else {
            System.out.println("[BusAssignment] All buses serving Route '" + routeId + "' are at capacity. Setting status to PENDING.");
            setStudentPending(student);
            logAdminAlert("Bus Assignment Failure: Route '" + routeId + "' buses are full. Student " + student.getName() + " (" + student.getId() + ") is pending.", "High");
            return false;
        }
    }

    private void setStudentPending(Student student) {
        student.setAssignmentStatus("BUS_PENDING");
        student.setStatus("BUS_PENDING");
        studentRepository.save(student);
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
