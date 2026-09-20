package com.safebus.transport.entity;

import com.safebus.common.model.JourneyEventType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "trip_timeline_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripTimelineEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "trip_id", nullable = false, length = 50)
    private String tripId;

    @Column(name = "bus_id", nullable = false, length = 50)
    private String busId;

    @Column(name = "student_id", length = 50)
    private String studentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private JourneyEventType eventType;

    @Column(length = 255)
    private String location;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "created_by", length = 100)
    private String createdBy;
}
