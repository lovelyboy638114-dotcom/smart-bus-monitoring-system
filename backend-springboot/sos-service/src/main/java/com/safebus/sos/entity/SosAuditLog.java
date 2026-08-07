package com.safebus.sos.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sos_audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SosAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "sos_id", nullable = false, length = 50)
    private String sosId;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "performed_by", nullable = false, length = 150)
    private String performedBy;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(length = 255)
    private String remarks;

    @Column(name = "ip_address", length = 50)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(length = 100)
    private String device;
}
