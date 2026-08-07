package com.safebus.assignment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "routes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {
    @Id
    @Column(length = 255)
    private String id;

    @Column(nullable = false, length = 255)
    private String name;
}
