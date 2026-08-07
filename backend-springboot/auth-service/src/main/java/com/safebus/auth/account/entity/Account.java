package com.safebus.auth.account.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "fullName", nullable = false, length = 150)
    private String fullName;

    @Column(name = "licenseNo", length = 100)
    private String licenseNo;

    @Column(name = "experienceYears")
    private Integer experienceYears;

    @Column(name = "busRoute", length = 100)
    private String busRoute;

    @Column(length = 50)
    private String phone;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword;

    @Column(name = "last_password_change")
    private LocalDateTime lastPasswordChange;

    @Column(name = "account_status", nullable = false, length = 50)
    private String accountStatus;

    @Column(name = "password_version", nullable = false)
    private int passwordVersion;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    @Column(name = "last_login")
    private LocalDateTime lastLogin;

    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Column(name = "lock_time")
    private LocalDateTime lockTime;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
