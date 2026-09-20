package com.safebus.student.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "students")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Student {
    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "rollNo", nullable = false, length = 50)
    private String rollNo;

    @Column(name = "class", nullable = false, length = 50)
    private String className;

    @Column(name = "busId", length = 50)
    private String busId;

    @Column(name = "boarded")
    private Integer boarded;

    @Column(name = "boardedTime", length = 50)
    private String boardedTime;

    @Column(name = "reachedSchool")
    private Integer reachedSchool;

    @Column(name = "boardedReturn")
    private Integer boardedReturn;

    @Column(name = "reachedHome")
    private Integer reachedHome;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "parentName", length = 150)
    private String parentName;

    @Column(name = "parentPhone", length = 50)
    private String parentPhone;

    @Column(name = "bloodGroup", length = 20)
    private String bloodGroup;

    @Column(length = 255)
    private String address;

    @Column(name = "medicalNotes", length = 255)
    private String medicalNotes;

    @Column(name = "student_id", unique = true, length = 50)
    private String studentIdCode;

    @Column(name = "admission_no", unique = true, length = 50)
    private String admissionNo;

    @Column(length = 50)
    private String gender;

    @Column(length = 50)
    private String dob;

    @Column(length = 50)
    private String section;

    @Column(length = 255)
    private String photo;

    @Column(name = "parent_id")
    private Integer parentId;

    @Column(name = "route_id", length = 50)
    private String routeId;

    @Column(name = "pickup_stop_id", length = 50)
    private String pickupStopId;

    @Column(name = "qr_code_path", length = 255)
    private String qrCodePath;

    @Column(name = "qr_token", unique = true, length = 255)
    private String qrToken;

    @Column(name = "student_status", length = 50)
    private String studentStatus;

    @Column(name = "school_email", unique = true, length = 100)
    private String schoolEmail;

    @Column(name = "pickup_distance")
    private Double pickupDistance;

    @Column(name = "assignment_status", length = 50)
    private String assignmentStatus;

    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;

    @Column(name = "id_card_front_path", length = 255)
    private String idCardFrontPath;

    @Column(name = "id_card_back_path", length = 255)
    private String idCardBackPath;

    @Column(name = "id_card_pdf_path", length = 255)
    private String idCardPdfPath;

    @Column(name = "id_card_generated_at")
    private LocalDateTime idCardGeneratedAt;

    @Column(name = "id_card_version")
    private Integer idCardVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_card_status", length = 50)
    private IdCardStatus idCardStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_card_failure_code", length = 50)
    private IdCardFailureCode idCardFailureCode;

    @Column(name = "id_card_failure_message", length = 255)
    private String idCardFailureMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "id_card_generation_stage", length = 50)
    private IdCardGenerationStage idCardGenerationStage;

    @Column(name = "id_card_generation_started_at")
    private LocalDateTime idCardGenerationStartedAt;

    @Column(name = "id_card_generation_completed_at")
    private LocalDateTime idCardGenerationCompletedAt;

    @Column(name = "id_card_checksum", length = 100)
    private String idCardChecksum;

    @Column(name = "id_card_file_size")
    private Long idCardFileSize;

    @Version
    @Column(name = "version")
    private Long version;
}
