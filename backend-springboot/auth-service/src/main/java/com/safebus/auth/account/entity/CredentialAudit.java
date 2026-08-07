package com.safebus.auth.account.entity;

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

    @Column(name = "generated_at", insertable = false, updatable = false)
    private LocalDateTime generatedAt;

    @Column(name = "credential_type", nullable = false, length = 50)
    private String credentialType;

    @Column(name = "first_login_completed", nullable = false)
    private boolean firstLoginCompleted;

    @Column(name = "download_count", nullable = false)
    private int downloadCount;

    @Column(name = "printed_count", nullable = false)
    private int printedCount;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "reset_time")
    private LocalDateTime resetTime;

    @Column(name = "password_changed")
    private LocalDateTime passwordChanged;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(length = 150)
    private String browser;

    @Column(length = 150)
    private String device;
}
