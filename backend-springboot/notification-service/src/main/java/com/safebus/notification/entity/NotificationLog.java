package com.safebus.notification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "sos_id", nullable = false, length = 50)
    private String sosId;

    @Column(name = "recipient_type", nullable = false, length = 50)
    private String recipientType; // Admin, Police, Parent

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "delivery_method", nullable = false, length = 50)
    private String deliveryMethod; // SocketIO, Push, MockSMS, MockEmail

    @Column(nullable = false, length = 50)
    private String status; // SENT, FAILED

    @Column(name = "sent_at", insertable = false, updatable = false)
    private LocalDateTime sentAt;

    @Column(name = "error_message", length = 255)
    private String errorMessage;
}
