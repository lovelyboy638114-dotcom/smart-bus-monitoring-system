package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sos_alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SosAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "sos_id", nullable = false, unique = true, length = 50)
    private String sosId;

    @Column(name = "bus_id", nullable = false, length = 50)
    private String busId;

    @Column(name = "driver_id", nullable = false, length = 100)
    private String driverId;

    @Column(name = "driver_name", nullable = false, length = 150)
    private String driverName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Integer speed;

    @Column(name = "route_name", length = 150)
    private String routeName;

    @Column(name = "emergency_type", nullable = false, length = 150)
    private String emergencyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SosStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SosSeverity severity;

    @Column(name = "is_test", nullable = false)
    private Boolean isTest;

    @Column(name = "police_station_id")
    private Integer policeStationId;

    @Column(name = "parent_notified", nullable = false)
    private Boolean parentNotified;

    @Column(name = "admin_notified", nullable = false)
    private Boolean adminNotified;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "acknowledged_by", length = 100)
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(length = 255)
    private String remarks;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by", length = 100)
    private String deletedBy;
}
