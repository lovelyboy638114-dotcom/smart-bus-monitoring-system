package com.safebus.attendance.repository;

import com.safebus.attendance.entity.AttendanceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceLogRepository extends JpaRepository<AttendanceLog, Integer> {
    List<AttendanceLog> findByStudentIdOrderByCreatedAtDesc(String studentId);
    Optional<AttendanceLog> findByStudentIdAndScanDateAndTripIdAndBusIdAndAttendanceTypeAndStatus(
            String studentId, String scanDate, String tripId, String busId, String attendanceType, String status);
}
