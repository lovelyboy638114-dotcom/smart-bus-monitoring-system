package com.safebus.student.service;

import com.safebus.student.config.IdCardProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocalIdCardStorageService implements IdCardStorageService {

    private final IdCardProperties properties;

    @PostConstruct
    public void init() {
        try {
            String base = properties.getStorageLocation();
            List<String> dirs = List.of(
                    "idcards/front",
                    "idcards/back",
                    "idcards/pdf",
                    "idcards/archive",
                    "qr",
                    "student-images",
                    "reports",
                    "temp"
            );
            for (String sub : dirs) {
                Path dirPath = Paths.get(base, sub);
                if (!Files.exists(dirPath)) {
                    Files.createDirectories(dirPath);
                    log.info("[StorageInit] Created directory: {}", dirPath);
                }
            }
        } catch (IOException e) {
            log.error("[StorageInit] Failed to initialize directories structure: ", e);
        }
    }

    @Override
    public String storeFile(byte[] bytes, String subDirectory, String fileName) throws IOException {
        validateDiskSpace();
        String base = properties.getStorageLocation();
        String cleanSubDir = subDirectory.replace("\\", "/");
        if (cleanSubDir.startsWith("/")) {
            cleanSubDir = cleanSubDir.substring(1);
        }
        if (cleanSubDir.endsWith("/")) {
            cleanSubDir = cleanSubDir.substring(0, cleanSubDir.length() - 1);
        }
        Path parent = Paths.get(base, cleanSubDir);
        if (!Files.exists(parent)) {
            Files.createDirectories(parent);
        }
        Path filePath = parent.resolve(fileName);
        Files.write(filePath, bytes);
        log.info("[Storage] Saved file to: {}", filePath);
        return "/uploads/" + cleanSubDir + "/" + fileName;
    }

    @Override
    public byte[] loadFile(String filePath) throws IOException {
        String base = properties.getStorageLocation();
        String subPath = filePath;
        if (filePath.contains("/uploads/")) {
            subPath = filePath.substring(filePath.indexOf("/uploads/") + 9);
        }
        Path path = Paths.get(base, subPath);
        return Files.readAllBytes(path);
    }

    @Override
    public void validateDiskSpace() throws IOException {
        File file = new File(properties.getStorageLocation());
        long freeSpace = file.getFreeSpace();
        long threshold = 50 * 1024 * 1024; // 50 MB threshold
        if (freeSpace < threshold) {
            throw new IOException("Critical storage failure: Low disk space (" + (freeSpace / 1024 / 1024) + " MB free)");
        }
    }

    @Override
    public void cleanTempFiles(int retentionHours) {
        Path tempPath = Paths.get(properties.getStorageLocation(), "temp");
        if (!Files.exists(tempPath)) return;
        Instant threshold = Instant.now().minus(retentionHours, ChronoUnit.HOURS);
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(tempPath)) {
            for (Path path : stream) {
                if (Files.isRegularFile(path)) {
                    BasicFileAttributes attr = Files.readAttributes(path, BasicFileAttributes.class);
                    if (attr.lastModifiedTime().toInstant().isBefore(threshold)) {
                        Files.delete(path);
                        log.info("[StorageCleanup] Deleted old temporary file: {}", path.getFileName());
                    }
                }
            }
        } catch (IOException e) {
            log.error("[StorageCleanup] Failed during temp cleanup: ", e);
        }
    }
}
