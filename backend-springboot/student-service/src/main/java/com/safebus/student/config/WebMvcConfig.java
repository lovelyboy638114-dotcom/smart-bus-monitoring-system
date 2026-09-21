package com.safebus.student.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${storage.location:${STORAGE_LOCATION:/app/uploads}}")
    private String storageLocation;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadsPath = Paths.get(storageLocation).toAbsolutePath().toUri().toString();
        if (!uploadsPath.endsWith("/")) {
            uploadsPath += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadsPath, "file:/app/uploads/", "file:uploads/", "file:C:/SafeBus/uploads/");
    }
}
