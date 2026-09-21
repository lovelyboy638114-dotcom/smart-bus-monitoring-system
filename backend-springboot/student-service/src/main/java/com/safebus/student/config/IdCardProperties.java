package com.safebus.student.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "idcard")
public class IdCardProperties {
    private String storageLocation = System.getenv("STORAGE_LOCATION") != null 
            ? System.getenv("STORAGE_LOCATION") 
            : (new java.io.File("/app/uploads").exists() ? "/app/uploads" : "C:/SafeBus/uploads");
    private int maxVersions = 5;
    private Archive archive = new Archive();
    private Retry retry = new Retry();

    @Data
    public static class Archive {
        private boolean enabled = true;
        private int retentionDays = 365;
    }

    @Data
    public static class Retry {
        private boolean enabled = true;
        private int maxAttempts = 3;
        private String initialDelay = "2s";
        private double multiplier = 2.5;
        private String maxDelay = "30s";
    }
}
