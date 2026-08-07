package com.safebus.assignment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Stop {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(length = 255)
    private String address;

    @Column(name = "route_id", length = 255)
    private String routeId;
}
