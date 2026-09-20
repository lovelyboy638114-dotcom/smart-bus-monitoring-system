package com.safebus.student.service;

import com.safebus.student.config.IdCardProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ArchiveService {

    private final IdCardProperties properties;

    public void archiveOldVersions(String studentId, String subDirectory) {
        if (!properties.getArchive().isEnabled()) {
            return;
        }
        String base = properties.getStorageLocation();
        Path dirPath = Paths.get(base, subDirectory);
        if (!Files.exists(dirPath)) return;

        try {
            List<Path> matchingFiles = new ArrayList<>();
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(dirPath, studentId + "_v*")) {
                for (Path p : stream) {
                    matchingFiles.add(p);
                }
            }

            matchingFiles.sort(Comparator.comparing(Path::getFileName));

            int maxVersions = properties.getMaxVersions();
            if (matchingFiles.size() > maxVersions) {
                Path archiveDir = Paths.get(base, "idcards/archive", subDirectory);
                if (!Files.exists(archiveDir)) {
                    Files.createDirectories(archiveDir);
                }
                for (int i = 0; i < matchingFiles.size() - maxVersions; i++) {
                    Path oldFile = matchingFiles.get(i);
                    Path archivedFile = archiveDir.resolve(oldFile.getFileName());
                    Files.move(oldFile, archivedFile, StandardCopyOption.REPLACE_EXISTING);
                    log.info("[Archive] Moved old asset to archive: {} -> {}", oldFile.getFileName(), archivedFile);
                }
            }
        } catch (IOException e) {
            log.error("[Archive] Failed to archive old versions of student {} in {}: ", studentId, subDirectory, e);
        }
    }

    public void pruneArchive() {
        if (!properties.getArchive().isEnabled()) return;
        Path archiveBase = Paths.get(properties.getStorageLocation(), "idcards/archive");
        if (!Files.exists(archiveBase)) return;

        long retentionDays = properties.getArchive().getRetentionDays();
        Instant threshold = Instant.now().minus(retentionDays, ChronoUnit.DAYS);

        try {
            Files.walkFileTree(archiveBase, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    if (attrs.lastModifiedTime().toInstant().isBefore(threshold)) {
                        Files.delete(file);
                        log.info("[ArchiveCleanup] Pruned expired archived asset: {}", file);
                    }
                    return FileVisitResult.CONTINUE;
                }
            });
        } catch (IOException e) {
            log.error("[ArchiveCleanup] Failed during archive pruning: ", e);
        }
    }
}
