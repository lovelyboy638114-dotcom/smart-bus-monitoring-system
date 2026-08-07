package com.safebus.attendance.service;

import com.safebus.attendance.dto.ScanRequest;
import com.safebus.attendance.entity.AttendanceLog;
import com.safebus.attendance.entity.StudentEvent;
import com.safebus.attendance.repository.AttendanceLogRepository;
import com.safebus.attendance.repository.StudentEventRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class AttendanceService {
    private final AttendanceLogRepository attendanceLogRepository;
    private final StudentEventRepository studentEventRepository;
    private final RabbitTemplate rabbitTemplate;

    public AttendanceService(AttendanceLogRepository attendanceLogRepository,
                             StudentEventRepository studentEventRepository,
                             RabbitTemplate rabbitTemplate) {
        this.attendanceLogRepository = attendanceLogRepository;
        this.studentEventRepository = studentEventRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public List<AttendanceLog> getStudentLogs(String studentId) {
        return attendanceLogRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
    }

    @Transactional
    public AttendanceLog logScan(ScanRequest req) {
        // Set date/time if not provided
        if (req.getScanDate() == null || req.getScanDate().isEmpty()) {
            req.setScanDate(LocalDate.now().toString());
        }
        if (req.getScanTime() == null || req.getScanTime().isEmpty()) {
            req.setScanTime(LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        }

        // Duplicate scan check (prevent scanning same student twice on same trip, date and type)
        Optional<AttendanceLog> existing = attendanceLogRepository
                .findByStudentIdAndScanDateAndTripIdAndBusIdAndAttendanceTypeAndStatus(
                        req.getStudentId(), req.getScanDate(), req.getTripId(), req.getBusId(),
                        req.getAttendanceType(), "Success");

        if (existing.isPresent()) {
            throw new RuntimeException("Duplicate scan detected for student: " + req.getStudentId());
        }

        // Log to database
        AttendanceLog log = AttendanceLog.builder()
                .studentId(req.getStudentId())
                .busId(req.getBusId())
                .driverName(req.getDriverName() != null ? req.getDriverName() : "Unknown Driver")
                .scanDate(req.getScanDate())
                .scanTime(req.getScanTime())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .attendanceType(req.getAttendanceType())
                .tripId(req.getTripId())
                .status("Success")
                .build();

        AttendanceLog saved = attendanceLogRepository.save(log);

        // Record Student Event
        StudentEvent event = StudentEvent.builder()
                .studentId(req.getStudentId())
                .eventName("Student " + req.getAttendanceType() + " at " + req.getScanTime())
                .build();
        studentEventRepository.save(event);

        // Publish event to RabbitMQ for Notifications and updates
        try {
            String routingKey = "attendance.event." + req.getAttendanceType().toLowerCase();
            rabbitTemplate.convertAndSend("attendance-exchange", routingKey, req);
        } catch (Exception e) {
            // Log warning but don't roll back the database transaction if RabbitMQ broker is offline locally
            System.err.println("[RabbitMQ Error] Failed to publish scan event: " + e.getMessage());
        }

        return saved;
    }
}
