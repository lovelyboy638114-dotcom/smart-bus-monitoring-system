package com.safebus.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "bus_id", nullable = false, length = 50)
    private String busId;

    @Column(name = "driver_name", nullable = false, length = 150)
    private String driverName;

    @Column(name = "scan_time", nullable = false, length = 50)
    private String scanTime;

    @Column(name = "scan_date", nullable = false, length = 50)
    private String scanDate;

    private Double latitude;

    private Double longitude;

    @Column(name = "attendance_type", nullable = false, length = 50)
    private String attendanceType;

    @Column(name = "trip_id", nullable = false, length = 100)
    private String tripId;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
