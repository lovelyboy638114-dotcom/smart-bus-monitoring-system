package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "parents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Parent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "father_name", nullable = false, length = 150)
    private String fatherName;

    @Column(name = "mother_name", nullable = false, length = 150)
    private String motherName;

    @Column(name = "guardian_name", length = 150)
    private String guardianName;

    @Column(nullable = false, length = 50)
    private String phone;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
