package com.safebus.transport.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "busId", length = 50)
    private String busId;

    private Double latitude;

    private Double longitude;

    private Integer speed;

    private Double acceleration;

    @Column(insertable = false, updatable = false)
    private LocalDateTime timestamp;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
