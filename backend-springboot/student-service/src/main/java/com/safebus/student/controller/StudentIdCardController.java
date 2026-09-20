package com.safebus.student.controller;

import com.safebus.common.dto.response.ApiResponse;
import com.safebus.student.config.IdCardProperties;
import com.safebus.student.entity.IdCardDownloadHistory;
import com.safebus.student.entity.IdCardStatus;
import com.safebus.student.entity.Student;
import com.safebus.student.repository.IdCardDownloadHistoryRepository;
import com.safebus.student.service.IDCardService;
import com.safebus.student.service.StudentService;
import io.micrometer.core.instrument.MeterRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Student ID Card System", description = "Endpoints for managing student digital PVC wallets, manual regenerations, download audits, and generation stage updates.")
public class StudentIdCardController {

    private final StudentService studentService;
    private final IDCardService idCardService;
    private final IdCardDownloadHistoryRepository downloadHistoryRepository;
    private final IdCardProperties properties;
    private final MeterRegistry meterRegistry;

    @GetMapping("/api/v1/student/my-id-card")
    @Operation(summary = "Get Authenticated Student's Own ID Card", description = "Query student's own PVC ID Card metadata details matching the authenticated JWT session.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyIdCard() {
        String correlationId = UUID.randomUUID().toString();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized", "AUTH_001", correlationId));
        }
        String username = auth.getName();
        try {
            Student student = studentService.getStudentBySchoolEmail(username);
            studentService.authorizeIdCardAccess(student.getId(), username, "STUDENT");

            if ((student.getIdCardStatus() == null || student.getIdCardStatus() == IdCardStatus.PENDING) 
                    && !"BUS_PENDING".equals(student.getStatus()) && student.getBusId() != null && !student.getBusId().isEmpty()) {
                log.info("[Controller] Card status is PENDING. Triggering background generation for student: {}", student.getId());
                student.setIdCardStatus(IdCardStatus.PROCESSING);
                studentService.saveStudent(student);
                
                final String stId = student.getId();
                new Thread(() -> {
                    try {
                        idCardService.generateIDCard(stId, correlationId);
                    } catch (Exception e) {
                        log.error("Failed background generation for student: " + stId, e);
                    }
                }).start();
            }

            return ResponseEntity.ok(ApiResponse.success("ID Card details retrieved successfully", mapStudentToCardData(student), correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage(), "STU_005", correlationId));
        }
    }

    @GetMapping("/api/v1/students/{id}/id-card")
    @Operation(summary = "Get Student ID Card details by student ID", description = "Query student PVC ID Card details (Accessible to Admin, linked Parents, and self Students).")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentIdCard(
            @PathVariable("id") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized", "AUTH_001", correlationId));
        }
        String username = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        try {
            studentService.authorizeIdCardAccess(studentId, username, role);
            Student student = studentService.getStudentById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

            if ((student.getIdCardStatus() == null || student.getIdCardStatus() == IdCardStatus.PENDING) 
                    && !"BUS_PENDING".equals(student.getStatus()) && student.getBusId() != null && !student.getBusId().isEmpty()) {
                log.info("[Controller] Card status is PENDING. Triggering background generation for student: {}", student.getId());
                student.setIdCardStatus(IdCardStatus.PROCESSING);
                studentService.saveStudent(student);
                
                final String stId = student.getId();
                new Thread(() -> {
                    try {
                        idCardService.generateIDCard(stId, correlationId);
                    } catch (Exception e) {
                        log.error("Failed background generation for student: " + stId, e);
                    }
                }).start();
            }

            return ResponseEntity.ok(ApiResponse.success("ID Card details retrieved successfully", mapStudentToCardData(student), correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage(), "STU_005", correlationId));
        }
    }

    @GetMapping("/api/v1/students/{id}/id-card/download")
    @Operation(summary = "Download Student ID Card PDF", description = "Download and audit the PDF identity card of a specific student.")
    public ResponseEntity<?> downloadIdCardPdf(
            @PathVariable("id") String studentId,
            HttpServletRequest request) {
        String correlationId = UUID.randomUUID().toString();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized", "AUTH_001", correlationId));
        }
        String username = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        try {
            studentService.authorizeIdCardAccess(studentId, username, role);
            Student student = studentService.getStudentById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

            if (student.getIdCardPdfPath() == null || student.getIdCardPdfPath().isEmpty()) {
                return ResponseEntity.status(404).body(ApiResponse.error("PDF ID Card not generated yet", "STU_007", correlationId));
            }

            String pdfRelativePath = student.getIdCardPdfPath();
            if (pdfRelativePath.contains("/uploads/")) {
                pdfRelativePath = pdfRelativePath.substring(pdfRelativePath.indexOf("/uploads/") + 9);
            }
            File file = new File(properties.getStorageLocation(), pdfRelativePath);
            if (!file.exists()) {
                return ResponseEntity.status(404).body(ApiResponse.error("PDF File not found on storage disk", "FILE_002", correlationId));
            }

            // Log download audit
            IdCardDownloadHistory history = IdCardDownloadHistory.builder()
                    .studentId(studentId)
                    .downloadedBy(username)
                    .role(role)
                    .ipAddress(request.getRemoteAddr())
                    .userAgent(request.getHeader("User-Agent") != null ? request.getHeader("User-Agent") : "Unknown")
                    .downloadedAt(LocalDateTime.now())
                    .build();
            downloadHistoryRepository.save(history);
            log.info("[Controller] Logged ID Card PDF download for student: {}, user: {}", studentId, username);

            // Increment custom Prometheus metric
            meterRegistry.counter("idcard.download.total").increment();

            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                    .body(resource);

        } catch (Exception e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage(), "STU_403", correlationId));
        }
    }

    @GetMapping("/api/v1/students/{id}/qr")
    @Operation(summary = "Get Student Boarding QR Code", description = "Query raw PNG check-in QR code asset of a student.")
    public ResponseEntity<?> getQrImage(@PathVariable("id") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Unauthorized", "AUTH_001", correlationId));
        }
        String username = auth.getName();
        String role = auth.getAuthorities().iterator().next().getAuthority();
        try {
            studentService.authorizeIdCardAccess(studentId, username, role);
            Student student = studentService.getStudentById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

            if (student.getQrCodePath() == null || student.getQrCodePath().isEmpty()) {
                return ResponseEntity.status(404).body(ApiResponse.error("QR Code not generated yet", "STU_008", correlationId));
            }

            String qrRel = student.getQrCodePath();
            if (qrRel.contains("/uploads/")) {
                qrRel = qrRel.substring(qrRel.indexOf("/uploads/") + 9);
            }
            File file = new File(properties.getStorageLocation(), qrRel);
            if (!file.exists()) {
                return ResponseEntity.status(404).body(ApiResponse.error("QR image file not found on disk", "FILE_002", correlationId));
            }

            Resource resource = new FileSystemResource(file);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.status(403).body(ApiResponse.error(e.getMessage(), "STU_403", correlationId));
        }
    }

    @PostMapping("/api/v1/admin/students/{id}/regenerate-id-card")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Regenerate ID card (Admins only)", description = "Force manual regeneration of a student's PVC card & QR code versioned outputs.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> regenerateIdCard(
            @PathVariable("id") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student student = studentService.regenerateIdCard(studentId);
            return ResponseEntity.ok(ApiResponse.success("ID Card regenerated successfully", mapStudentToCardData(student), correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Regeneration failed: " + e.getMessage(), "GEN_500", correlationId));
        }
    }

    @GetMapping("/api/v1/admin/students/{id}/generation-status")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Check ID generation status (Admins only)", description = "Check active stage progress details of a student badge generation request.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGenerationStatus(
            @PathVariable("id") String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student student = studentService.getStudentById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
            Map<String, Object> statusMap = new HashMap<>();
            statusMap.put("student_id", studentId);
            statusMap.put("status", student.getIdCardStatus() != null ? student.getIdCardStatus().name() : "PENDING");
            statusMap.put("stage", student.getIdCardGenerationStage() != null ? student.getIdCardGenerationStage().name() : "QUEUED");
            statusMap.put("started_at", student.getIdCardGenerationStartedAt() != null ? student.getIdCardGenerationStartedAt().toString() : null);
            statusMap.put("completed_at", student.getIdCardGenerationCompletedAt() != null ? student.getIdCardGenerationCompletedAt().toString() : null);
            statusMap.put("failure_code", student.getIdCardFailureCode() != null ? student.getIdCardFailureCode().name() : null);
            statusMap.put("failure_message", student.getIdCardFailureMessage());

            return ResponseEntity.ok(ApiResponse.success("ID Card status retrieved", statusMap, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404).body(ApiResponse.error(e.getMessage(), "STU_005", correlationId));
        }
    }

    private Map<String, Object> mapStudentToCardData(Student student) {
        Map<String, Object> data = new HashMap<>();
        data.put("student_id", student.getId());
        data.put("name", student.getName());
        data.put("rollNo", student.getRollNo());
        data.put("class_name", student.getClassName());
        data.put("admission_no", student.getAdmissionNo());
        data.put("front_path", student.getIdCardFrontPath());
        data.put("back_path", student.getIdCardBackPath());
        data.put("pdf_path", student.getIdCardPdfPath());
        data.put("version", student.getIdCardVersion());
        data.put("status", student.getIdCardStatus() != null ? student.getIdCardStatus().name() : "PENDING");
        data.put("stage", student.getIdCardGenerationStage() != null ? student.getIdCardGenerationStage().name() : "QUEUED");
        data.put("checksum", student.getIdCardChecksum());
        data.put("file_size", student.getIdCardFileSize());
        data.put("generated_at", student.getIdCardGeneratedAt() != null ? student.getIdCardGeneratedAt().toString() : null);
        return data;
    }
}
