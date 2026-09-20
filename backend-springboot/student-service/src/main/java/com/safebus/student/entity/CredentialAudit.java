package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "credential_audits")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CredentialAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "account_id", nullable = false)
    private Integer accountId;

    @Column(name = "generated_by", nullable = false, length = 100)
    private String generatedBy;

    @Column(name = "credential_type", nullable = false, length = 50)
    private String credentialType;

    @Column(name = "first_login_completed", nullable = false)
    private boolean firstLoginCompleted;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(length = 100)
    private String browser;

    @Column(length = 50)
    private String device;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
