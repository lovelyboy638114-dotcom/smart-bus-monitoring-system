package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "id_card_download_history")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdCardDownloadHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "downloaded_by", nullable = false, length = 100)
    private String downloadedBy;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(name = "ip_address", nullable = false, length = 50)
    private String ipAddress;

    @Column(name = "user_agent", nullable = false, length = 255)
    private String userAgent;

    @Column(name = "downloaded_at", nullable = false)
    private LocalDateTime downloadedAt;
}
