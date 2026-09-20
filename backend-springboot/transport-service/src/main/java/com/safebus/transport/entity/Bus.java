package com.safebus.transport.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "buses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bus {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 150)
    private String route;

    @Column(nullable = false, length = 150)
    private String driver;

    @Column(name = "driverLicense", length = 100)
    private String driverLicense;

    @Column(name = "driverExperience")
    private Integer driverExperience;

    @Column(nullable = false)
    private int speed;

    @Column(name = "maxSpeed", nullable = false)
    private int maxSpeed;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(length = 50)
    private String eta;

    @Column(name = "nextStop", length = 150)
    private String nextStop;

    @Column(name = "studentsOnboard", nullable = false)
    private int studentsOnboard;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private int deviation;

    @Column(nullable = false)
    private int capacity;

    @Column(name = "route_id", length = 255)
    private String routeId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}
