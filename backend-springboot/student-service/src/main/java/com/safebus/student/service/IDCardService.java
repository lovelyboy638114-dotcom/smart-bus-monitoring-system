package com.safebus.student.service;

import com.safebus.student.config.IdCardProperties;
import com.safebus.student.entity.IdCardFailureCode;
import com.safebus.student.entity.IdCardGenerationStage;
import com.safebus.student.entity.IdCardStatus;
import com.safebus.student.entity.Student;
import com.safebus.student.repository.StudentRepository;
import com.safebus.student.websocket.IdCardProgressPublisher;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import javax.imageio.ImageIO;

@Slf4j
@Service
@RequiredArgsConstructor
public class IDCardService {

    private final QrGenerationService qrGenerationService;
    private final FrontCardRenderer frontCardRenderer;
    private final BackCardRenderer backCardRenderer;
    private final PdfGenerationService pdfGenerationService;
    private final ChecksumService checksumService;
    private final IdCardStorageService storageService;
    private final ArchiveService archiveService;
    private final StudentRepository studentRepository;
    private final IdCardProperties properties;
    private final IdCardProgressPublisher progressPublisher;
    private final MeterRegistry meterRegistry;

    @Transactional
    public Map<String, String> generateIDCard(String studentId, String correlationId) throws Exception {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

        long startTime = System.currentTimeMillis();
        String threadName = Thread.currentThread().getName();
        int version = (student.getIdCardVersion() != null ? student.getIdCardVersion() : 0) + 1;
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss"));

        log.info("[Pipeline] Starting ID Card generation for student: {}, version: {}, correlation: {}, thread: {}", 
                studentId, version, correlationId, threadName);

        // Update stage to QUEUED/PROCESSING
        updateGenerationStage(student, IdCardGenerationStage.QUEUED, correlationId);

        try {
            // 1. Generate QR Code
            updateGenerationStage(student, IdCardGenerationStage.GENERATING_QR, correlationId);
            log.info("[Pipeline] Generating QR...");
            String qrPayload = "=== SafeBus AI - Student ID ===\n" +
                    "ID: " + studentId + "\n" +
                    "Name: " + student.getName() + "\n" +
                    "Roll No: " + student.getRollNo() + "\n" +
                    "Class: " + student.getClassName() + "\n" +
                    "Status: ACTIVE";
            byte[] qrBytes = qrGenerationService.generateQRCodeBytes(qrPayload, 180, 180);
            if (qrBytes == null || qrBytes.length == 0) {
                throw new IOException("Failed to generate QR bytes (empty)");
            }

            // 2. Draw Front and Back
            updateGenerationStage(student, IdCardGenerationStage.GENERATING_FRONT, correlationId);
            log.info("[Pipeline] Generating Front Card...");
            BufferedImage frontImage = frontCardRenderer.renderFront(student, properties.getStorageLocation());

            updateGenerationStage(student, IdCardGenerationStage.GENERATING_BACK, correlationId);
            log.info("[Pipeline] Generating Back Card...");
            BufferedImage backImage = backCardRenderer.renderBack(student, qrBytes);

            // 3. Compile PDF
            updateGenerationStage(student, IdCardGenerationStage.GENERATING_PDF, correlationId);
            log.info("[Pipeline] Generating PDF...");
            byte[] pdfBytes = pdfGenerationService.compileToPdfBytes(frontImage, backImage);

            // 4. Validate assets
            updateGenerationStage(student, IdCardGenerationStage.VERIFYING, correlationId);
            log.info("[Pipeline] Verifying PDF structural integrity...");
            if (!pdfGenerationService.validatePdf(pdfBytes)) {
                throw new IOException("PDF validation failed (structural error)");
            }

            // Calculate checksum
            String checksum = checksumService.calculateSHA256(pdfBytes);

            // 5. Store atomically in temp and move
            log.info("[Pipeline] Storing files in temp directory...");
            ByteArrayOutputStream frontBaos = new ByteArrayOutputStream();
            ImageIO.write(frontImage, "PNG", frontBaos);
            byte[] frontBytes = frontBaos.toByteArray();

            ByteArrayOutputStream backBaos = new ByteArrayOutputStream();
            ImageIO.write(backImage, "PNG", backBaos);
            byte[] backBytes = backBaos.toByteArray();

            // Write all to temp directory first
            String tempQrFile = "temp_" + studentId + "_qr.png";
            String tempFrontFile = "temp_" + studentId + "_front.png";
            String tempBackFile = "temp_" + studentId + "_back.png";
            String tempPdfFile = "temp_" + studentId + ".pdf";

            String tempQrRel = storageService.storeFile(qrBytes, "temp", tempQrFile);
            String tempFrontRel = storageService.storeFile(frontBytes, "temp", tempFrontFile);
            String tempBackRel = storageService.storeFile(backBytes, "temp", tempBackFile);
            String tempPdfRel = storageService.storeFile(pdfBytes, "temp", tempPdfFile);

            // Confirm post-temp checksum matches
            String tempPdfAbs = properties.getStorageLocation() + "/temp/" + tempPdfFile;
            byte[] writtenPdfBytes = Files.readAllBytes(Paths.get(tempPdfAbs));
            String writtenChecksum = checksumService.calculateSHA256(writtenPdfBytes);
            if (!checksum.equals(writtenChecksum)) {
                throw new IOException("Checksum mismatch after temporary file write!");
            }

            // Atomic move to public folders
            log.info("[Pipeline] Atomic moving files to destination folders...");
            String base = properties.getStorageLocation();

            String qrName = studentId + "_v" + version + "_" + timestamp + ".png";
            String frontName = studentId + "_front_v" + version + "_" + timestamp + ".png";
            String backName = studentId + "_back_v" + version + "_" + timestamp + ".png";
            String pdfName = studentId + "_v" + version + "_" + timestamp + ".pdf";

            Path finalQrPath = Paths.get(base, "qr", qrName);
            Path finalFrontPath = Paths.get(base, "idcards/front", frontName);
            Path finalBackPath = Paths.get(base, "idcards/back", backName);
            Path finalPdfPath = Paths.get(base, "idcards/pdf", pdfName);

            Files.move(Paths.get(base, "temp", tempQrFile), finalQrPath, StandardCopyOption.ATOMIC_MOVE);
            Files.move(Paths.get(base, "temp", tempFrontFile), finalFrontPath, StandardCopyOption.ATOMIC_MOVE);
            Files.move(Paths.get(base, "temp", tempBackFile), finalBackPath, StandardCopyOption.ATOMIC_MOVE);
            Files.move(Paths.get(base, "temp", tempPdfFile), finalPdfPath, StandardCopyOption.ATOMIC_MOVE);

            // Checksum check after final move
            byte[] finalPdfBytes = Files.readAllBytes(finalPdfPath);
            String postMoveChecksum = checksumService.calculateSHA256(finalPdfBytes);
            if (!checksum.equals(postMoveChecksum)) {
                throw new IOException("Checksum mismatch after moving file to final destination!");
            }

            // Clean up temp refs if any left
            Files.deleteIfExists(Paths.get(base, "temp", tempQrFile));
            Files.deleteIfExists(Paths.get(base, "temp", tempFrontFile));
            Files.deleteIfExists(Paths.get(base, "temp", tempBackFile));
            Files.deleteIfExists(Paths.get(base, "temp", tempPdfFile));

            // Archive old versioned files
            archiveService.archiveOldVersions(studentId, "qr");
            archiveService.archiveOldVersions(studentId, "idcards/front");
            archiveService.archiveOldVersions(studentId, "idcards/back");
            archiveService.archiveOldVersions(studentId, "idcards/pdf");

            // Build relative URLs
            String qrUrl = "/uploads/qr/" + qrName;
            String frontUrl = "/uploads/idcards/front/" + frontName;
            String backUrl = "/uploads/idcards/back/" + backName;
            String pdfUrl = "/uploads/idcards/pdf/" + pdfName;

            // 6. Update student record
            student.setQrCodePath(qrUrl);
            student.setIdCardFrontPath(frontUrl);
            student.setIdCardBackPath(backUrl);
            student.setIdCardPdfPath(pdfUrl);
            student.setIdCardVersion(version);
            student.setIdCardChecksum(checksum);
            student.setIdCardFileSize((long) pdfBytes.length);
            student.setIdCardStatus(IdCardStatus.GENERATED);
            student.setIdCardGenerationStage(IdCardGenerationStage.COMPLETED);
            student.setIdCardGenerationCompletedAt(LocalDateTime.now());
            student.setIdCardFailureCode(null);
            student.setIdCardFailureMessage(null);
            studentRepository.save(student);

            long duration = System.currentTimeMillis() - startTime;
            log.info("[Pipeline] Completed Successfully! Student: {}, duration: {}ms", studentId, duration);

            // Increment custom Prometheus metric
            meterRegistry.counter("idcard.generation.success").increment();

            // Notify UI
            progressPublisher.publishProgress(studentId, IdCardGenerationStage.COMPLETED, 100, correlationId);

            Map<String, String> result = new HashMap<>();
            result.put("front_path", frontUrl);
            result.put("back_path", backUrl);
            result.put("pdf_path", pdfUrl);
            return result;

        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("[Pipeline] Generation failed for student: {} after {}ms, error: ", studentId, duration, e);
            
            // Increment custom Prometheus metric
            meterRegistry.counter("idcard.generation.failed").increment();

            student.setIdCardStatus(IdCardStatus.FAILED);
            student.setIdCardGenerationStage(IdCardGenerationStage.FAILED);
            
            // Map failure classification enum
            IdCardFailureCode code = IdCardFailureCode.UNKNOWN;
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown generation error";
            if (msg.contains("MissingTemplateException") || msg.contains("template")) {
                code = IdCardFailureCode.TEMPLATE_NOT_FOUND;
            } else if (msg.contains("photo") || msg.contains("Avatar")) {
                code = IdCardFailureCode.PHOTO_NOT_FOUND;
            } else if (msg.contains("QR")) {
                code = IdCardFailureCode.QR_FAILED;
            } else if (msg.contains("PDF")) {
                code = IdCardFailureCode.PDF_FAILED;
            } else if (msg.contains("Checksum")) {
                code = IdCardFailureCode.CHECKSUM_FAILED;
            } else if (msg.contains("disk") || msg.contains("storage") || msg.contains("space")) {
                code = IdCardFailureCode.STORAGE_ERROR;
            }
            student.setIdCardFailureCode(code);
            student.setIdCardFailureMessage(msg);
            studentRepository.save(student);

            progressPublisher.publishProgress(studentId, IdCardGenerationStage.FAILED, 0, correlationId);
            throw e;
        }
    }

    private void updateGenerationStage(Student student, IdCardGenerationStage stage, String correlationId) {
        student.setIdCardGenerationStage(stage);
        if (stage == IdCardGenerationStage.QUEUED || stage == IdCardGenerationStage.GENERATING_QR) {
            student.setIdCardGenerationStartedAt(LocalDateTime.now());
            if (student.getIdCardStatus() != IdCardStatus.REGENERATING) {
                student.setIdCardStatus(IdCardStatus.PROCESSING);
            }
        }
        studentRepository.save(student);

        int progress = 0;
        switch (stage) {
            case QUEUED: progress = 10; break;
            case GENERATING_QR: progress = 30; break;
            case GENERATING_FRONT: progress = 50; break;
            case GENERATING_BACK: progress = 70; break;
            case GENERATING_PDF: progress = 85; break;
            case VERIFYING: progress = 95; break;
            case COMPLETED: progress = 100; break;
            case FAILED: progress = 0; break;
        }
        progressPublisher.publishProgress(student.getId(), stage, progress, correlationId);
    }
}
