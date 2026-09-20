package com.safebus.student.scheduler;

import com.safebus.student.service.ArchiveService;
import com.safebus.student.service.IdCardStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ArchivePruningScheduler {

    private final ArchiveService archiveService;
    private final IdCardStorageService storageService;

    // Run every day at midnight (cron: "0 0 0 * * ?")
    @Scheduled(cron = "0 0 0 * * ?")
    public void executePruning() {
        log.info("[Scheduler] Starting scheduled archive and temporary folder pruning jobs...");
        try {
            // Prune expired archived files (older than configurable retention-days)
            archiveService.pruneArchive();

            // Clean orphan temporary files older than 24 hours
            storageService.cleanTempFiles(24);

            log.info("[Scheduler] Scheduled pruning jobs completed successfully.");
        } catch (Exception e) {
            log.error("[Scheduler] Scheduled pruning jobs failed: ", e);
        }
    }
}
