package com.safebus.transport.driver;

import com.safebus.common.model.DriverStatus;
import com.safebus.common.model.IncidentStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "driver_incidents")
public class DriverIncident {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "driver_id", nullable = false, length = 50)
    private String driverId;

    @Column(name = "bus_id", nullable = false, length = 50)
    private String busId;

    @Column(name = "route_id", length = 50)
    private String routeId;

    @Column(name = "trip_id", length = 50)
    private String tripId;

    @Enumerated(EnumType.STRING)
    @Column(name = "incident_type", nullable = false, length = 50)
    private DriverStatus incidentType;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "image_path")
    private String imagePath;

    @Column(name = "video_path")
    private String videoPath;

    private Double latitude;
    private Double longitude;
    private Double speed;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private IncidentStatus status;

    @Column(nullable = false)
    private Boolean resolved;

    @Column(name = "resolved_by", length = 100)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
