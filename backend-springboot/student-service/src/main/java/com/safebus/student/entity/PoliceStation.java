package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "police_stations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PoliceStation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "station_name", nullable = false, length = 150)
    private String stationName;

    @Column(nullable = false, length = 50)
    private String phone;

    @Column(length = 100)
    private String email;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false, length = 255)
    private String address;
}
