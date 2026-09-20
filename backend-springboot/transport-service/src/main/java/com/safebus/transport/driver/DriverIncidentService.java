package com.safebus.transport.driver;

import com.safebus.common.dto.event.DriverIncidentEventV1;
import com.safebus.common.model.DriverStatus;
import com.safebus.common.model.IncidentStatus;
import com.safebus.transport.event.DriverIncidentCreatedEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class DriverIncidentService {
    private final DriverIncidentRepository incidentRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${storage.location:C:/SafeBus/uploads}")
    private String storageLocation;

    public DriverIncidentService(DriverIncidentRepository incidentRepository, ApplicationEventPublisher eventPublisher) {
        this.incidentRepository = incidentRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public Long recordIncident(String driverId, String busId, String routeId, String tripId,
                               String incidentType, Double confidence, String imageBase64,
                               Double latitude, Double longitude, Double speed) {
        String imagePath = null;
        if (imageBase64 != null && !imageBase64.isEmpty()) {
            try {
                byte[] bytes;
                if (imageBase64.contains(",")) {
                    bytes = Base64.getDecoder().decode(imageBase64.split(",")[1]);
                } else {
                    bytes = Base64.getDecoder().decode(imageBase64);
                }
                String subDir = "/driver-incidents";
                String parentDir = storageLocation + subDir;
                Files.createDirectories(Paths.get(parentDir));
                String fileName = UUID.randomUUID().toString() + ".jpg";
                Path filePath = Paths.get(parentDir, fileName);
                Files.write(filePath, bytes);
                imagePath = "/uploads/driver-incidents/" + fileName;
            } catch (Exception e) {
                System.err.println("[DriverIncidentService] Failed to write incident image to " + storageLocation + ": " + e.getMessage());
            }
        }

        DriverStatus driverStatus;
        try {
            driverStatus = DriverStatus.valueOf(incidentType.toUpperCase());
        } catch (Exception e) {
            driverStatus = DriverStatus.NORMAL;
        }

        if (driverStatus == DriverStatus.NORMAL || driverStatus == DriverStatus.UNKNOWN) {
            System.err.println("[DriverIncidentService] Blocked database insertion for status: " + driverStatus);
            throw new IllegalArgumentException("Incident validation failed: NORMAL/UNKNOWN cannot be recorded as incidents.");
        }

        DriverIncident incident = DriverIncident.builder()
                .driverId(driverId)
                .busId(busId)
                .routeId(routeId)
                .tripId(tripId)
                .incidentType(driverStatus)
                .confidence(confidence)
                .imagePath(imagePath)
                .latitude(latitude)
                .longitude(longitude)
                .speed(speed)
                .status(IncidentStatus.OPEN)
                .resolved(false)
                .createdAt(LocalDateTime.now())
                .build();

        DriverIncident saved = incidentRepository.save(incident);

        // Publish to Event Bus
        DriverIncidentEventV1 dto = DriverIncidentEventV1.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(UUID.randomUUID().toString())
                .timestamp(LocalDateTime.now())
                .driverId(driverId)
                .busId(busId)
                .routeId(routeId)
                .tripId(tripId)
                .incidentType(driverStatus.name())
                .confidence(confidence)
                .imagePath(imagePath)
                .latitude(latitude)
                .longitude(longitude)
                .speed(speed)
                .status(IncidentStatus.OPEN.name())
                .build();

        eventPublisher.publishEvent(new DriverIncidentCreatedEvent(this, dto));

        return saved.getId();
    }

    public List<DriverIncident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    @Transactional
    public void resolveIncident(Long id, String resolvedBy) {
        incidentRepository.findById(id).ifPresent(incident -> {
            incident.setResolved(true);
            incident.setStatus(IncidentStatus.RESOLVED);
            incident.setResolvedBy(resolvedBy);
            incident.setResolvedAt(LocalDateTime.now());
            incidentRepository.save(incident);
        });
    }
}
