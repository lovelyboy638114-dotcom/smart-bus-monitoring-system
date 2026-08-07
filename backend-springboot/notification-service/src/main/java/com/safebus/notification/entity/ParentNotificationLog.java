package com.safebus.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "parent_notification_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentNotificationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "notification_type", nullable = false, length = 100)
    private String notificationType;

    @Column(name = "delivery_method", nullable = false, length = 50)
    private String deliveryMethod; // 'SMS', 'Email', 'Push'

    @Column(nullable = false, length = 50)
    private String status; // 'SENT', 'FAILED'

    @Column(name = "sent_at", insertable = false, updatable = false)
    private LocalDateTime sentAt;
}
