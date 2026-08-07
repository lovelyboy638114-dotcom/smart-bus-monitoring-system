package com.safebus.assignment.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 255)
    private String address;

    @Column(name = "busId", length = 50)
    private String busId;

    @Column(name = "route_id", length = 50)
    private String routeId;

    @Column(name = "pickup_stop_id", length = 50)
    private String pickupStopId;

    @Column(name = "pickup_distance")
    private Double pickupDistance;

    @Column(name = "assignment_status", length = 50)
    private String assignmentStatus;

    @Column(length = 50)
    private String status;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "student_status", length = 50)
    private String studentStatus;
}
