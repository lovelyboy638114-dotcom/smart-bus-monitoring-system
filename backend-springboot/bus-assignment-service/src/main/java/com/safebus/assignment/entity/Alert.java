package com.safebus.assignment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 150)
    private String type;

    @Column(nullable = false, length = 50)
    private String severity;

    @Column(length = 50)
    private String bus;

    @Column(length = 150)
    private String driver;

    @Column(length = 50)
    private String time;

    @Column(nullable = false)
    private int resolved;
}
