package com.safebus.student.actuator;

import com.safebus.student.config.IdCardProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
@RequiredArgsConstructor
public class IdCardStorageHealthIndicator implements HealthIndicator {

    private final IdCardProperties properties;

    @Override
    public Health health() {
        try {
            File dir = new File(properties.getStorageLocation());
            if (!dir.exists()) {
                return Health.down()
                        .withDetail("storageLocation", properties.getStorageLocation())
                        .withDetail("error", "Directory does not exist")
                        .build();
            }
            if (!dir.canWrite()) {
                return Health.down()
                        .withDetail("storageLocation", properties.getStorageLocation())
                        .withDetail("error", "Directory is not writable")
                        .build();
            }
            long freeSpace = dir.getFreeSpace();
            long threshold = 50 * 1024 * 1024; // 50 MB
            if (freeSpace < threshold) {
                return Health.down()
                        .withDetail("storageLocation", properties.getStorageLocation())
                        .withDetail("freeSpaceBytes", freeSpace)
                        .withDetail("error", "Insufficient disk space (less than 50MB free)")
                        .build();
            }
            return Health.up()
                    .withDetail("storageLocation", properties.getStorageLocation())
                    .withDetail("freeSpaceMB", freeSpace / 1024 / 1024)
                    .build();
        } catch (Exception e) {
            return Health.down(e).build();
        }
    }
}
