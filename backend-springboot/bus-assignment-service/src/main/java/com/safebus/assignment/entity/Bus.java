package com.safebus.assignment.entity;

import jakarta.persistence.*;
import lombok.*;

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
    private String driver;

    @Column(name = "route_id", length = 255)
    private String routeId;

    @Column(nullable = false)
    private int capacity;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;
}
