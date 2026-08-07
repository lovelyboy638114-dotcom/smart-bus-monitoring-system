package com.safebus.attendance.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "event_name", nullable = false, length = 150)
    private String eventName;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
