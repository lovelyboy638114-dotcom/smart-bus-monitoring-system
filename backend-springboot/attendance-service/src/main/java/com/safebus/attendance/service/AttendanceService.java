package com.safebus.attendance.service;

import com.safebus.attendance.dto.ScanRequest;
import com.safebus.attendance.entity.AttendanceLog;
import com.safebus.attendance.entity.StudentEvent;
import com.safebus.attendance.repository.AttendanceLogRepository;
import com.safebus.attendance.repository.StudentEventRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

    @PersistenceContext
    private EntityManager entityManager;

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
        // Resolve studentId to primary students.id if rollNo or admissionNo was passed
        try {
            List<?> rows = entityManager.createNativeQuery(
                "SELECT id FROM students WHERE id = :sid OR rollNo = :sid OR roll_no = :sid OR admission_no = :sid OR student_id = :sid"
            )
            .setParameter("sid", req.getStudentId())
            .setMaxResults(1)
            .getResultList();

            if (!rows.isEmpty()) {
                req.setStudentId(rows.get(0).toString());
            }
        } catch (Exception e) {
            System.err.println("[AttendanceService] Could not resolve student primary id: " + e.getMessage());
        }

        // Set date/time if not provided
        if (req.getScanDate() == null || req.getScanDate().isEmpty()) {
            req.setScanDate(LocalDate.now().toString());
        }
        if (req.getScanTime() == null || req.getScanTime().isEmpty()) {
            req.setScanTime(LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        }
        if (req.getAttendanceType() == null || req.getAttendanceType().trim().isEmpty()) {
            req.setAttendanceType("Boarded");
        }
        if (req.getTripId() == null || req.getTripId().trim().isEmpty()) {
            req.setTripId("TRIP-01");
        }

        // Duplicate scan check (prevent duplicate log records for same student on same trip & date)
        Optional<AttendanceLog> existing = attendanceLogRepository
                .findByStudentIdAndScanDateAndTripIdAndBusIdAndAttendanceTypeAndStatus(
                        req.getStudentId(), req.getScanDate(), req.getTripId(), req.getBusId(),
                        req.getAttendanceType(), "Success");

        AttendanceLog saved;
        if (existing.isPresent()) {
            saved = existing.get();
            saved.setScanTime(req.getScanTime());
            attendanceLogRepository.save(saved);
        } else {
            // Log new attendance record to database
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

            saved = attendanceLogRepository.save(log);

            // Record Student Event
            StudentEvent event = StudentEvent.builder()
                    .studentId(req.getStudentId())
                    .eventName("Student " + req.getAttendanceType() + " at " + req.getScanTime())
                    .build();
            studentEventRepository.save(event);
        }

        // CRITICAL: Synchronize student entity in MySQL students table directly
        try {
            updateStudentAttendanceInDb(req.getStudentId(), req.getAttendanceType(), req.getScanTime());
        } catch (Exception e) {
            System.err.println("[AttendanceService] Error updating students table: " + e.getMessage());
        }

        // Publish event to RabbitMQ for Notifications and updates
        try {
            String routingKey = "attendance.event." + req.getAttendanceType().toLowerCase();
            rabbitTemplate.convertAndSend("attendance-exchange", routingKey, req);
        } catch (Exception e) {
            System.err.println("[RabbitMQ Error] Failed to publish scan event: " + e.getMessage());
        }

        return saved;
    }

    @Transactional
    public void updateStudentAttendanceInDb(String studentId, String attendanceType, String scanTime) {
        if (attendanceType == null) return;

        if ("Boarded".equalsIgnoreCase(attendanceType) || "boarded".equalsIgnoreCase(attendanceType)) {
            entityManager.createNativeQuery(
                "UPDATE students SET boarded = 1, boarded_time = :scanTime, boardedTime = :scanTime, " +
                "status = 'Present', student_status = 'On Board' " +
                "WHERE id = :id OR student_id = :id OR rollNo = :id OR roll_no = :id"
            )
            .setParameter("scanTime", scanTime)
            .setParameter("id", studentId)
            .executeUpdate();
        } else if ("Arrived".equalsIgnoreCase(attendanceType) || "reachedSchool".equalsIgnoreCase(attendanceType)) {
            entityManager.createNativeQuery(
                "UPDATE students SET reached_school = 1, reachedSchool = 1, " +
                "status = 'Present', student_status = 'Dropped' " +
                "WHERE id = :id OR student_id = :id OR rollNo = :id OR roll_no = :id"
            )
            .setParameter("id", studentId)
            .executeUpdate();
        } else if ("ReturnBoarded".equalsIgnoreCase(attendanceType) || "BoardedReturn".equalsIgnoreCase(attendanceType)) {
            entityManager.createNativeQuery(
                "UPDATE students SET boarded_return = 1, boardedReturn = 1, " +
                "status = 'Present', student_status = 'Returning' " +
                "WHERE id = :id OR student_id = :id OR rollNo = :id OR roll_no = :id"
            )
            .setParameter("id", studentId)
            .executeUpdate();
        } else if ("HomeDropped".equalsIgnoreCase(attendanceType) || "ReachedHome".equalsIgnoreCase(attendanceType)) {
            entityManager.createNativeQuery(
                "UPDATE students SET reached_home = 1, reachedHome = 1, " +
                "status = 'Present', student_status = 'Reached Home' " +
                "WHERE id = :id OR student_id = :id OR rollNo = :id OR roll_no = :id"
            )
            .setParameter("id", studentId)
            .executeUpdate();
        }
    }

    @Transactional
    public void resetDailyAttendance(String busId) {
        resetDailyAttendance(busId, "ALL");
    }

    @Transactional
    public void resetDailyAttendance(String busId, String shift) {
        boolean isMorning = "MORNING".equalsIgnoreCase(shift);
        boolean isReturn = "RETURN".equalsIgnoreCase(shift) || "EVENING".equalsIgnoreCase(shift);

        String updateFields;
        if (isMorning) {
            updateFields = "boarded = 0, boarded_time = NULL, boardedTime = NULL, reached_school = 0, reachedSchool = 0, " +
                           "status = CASE WHEN boarded_return = 1 OR boardedReturn = 1 THEN 'Present' ELSE 'Absent' END, " +
                           "student_status = CASE WHEN boarded_return = 1 OR boardedReturn = 1 THEN 'Returning' ELSE 'Waiting' END ";
        } else if (isReturn) {
            updateFields = "boarded_return = 0, boardedReturn = 0, reached_home = 0, reachedHome = 0, " +
                           "status = CASE WHEN boarded = 1 THEN 'Present' ELSE 'Absent' END, " +
                           "student_status = CASE WHEN boarded = 1 THEN 'On Board' ELSE 'Waiting' END ";
        } else {
            updateFields = "boarded = 0, boarded_time = NULL, boardedTime = NULL, " +
                           "reached_school = 0, reachedSchool = 0, boarded_return = 0, boardedReturn = 0, " +
                           "reached_home = 0, reachedHome = 0, status = 'Absent', student_status = 'Waiting' ";
        }

        if (busId != null && !busId.isEmpty() && !"ALL".equalsIgnoreCase(busId)) {
            entityManager.createNativeQuery(
                "UPDATE students SET " + updateFields + " WHERE busId = :busId OR bus_id = :busId"
            )
            .setParameter("busId", busId)
            .executeUpdate();
        } else {
            entityManager.createNativeQuery(
                "UPDATE students SET " + updateFields
            )
            .executeUpdate();
        }
    }

    @Transactional
    public void markStudentAbsent(String studentId) {
        entityManager.createNativeQuery(
            "UPDATE students SET boarded = 0, boarded_time = NULL, boardedTime = NULL, " +
            "status = 'Absent', student_status = 'Waiting' " +
            "WHERE id = :id OR student_id = :id OR rollNo = :id OR roll_no = :id"
        )
        .setParameter("id", studentId)
        .executeUpdate();
    }
}
