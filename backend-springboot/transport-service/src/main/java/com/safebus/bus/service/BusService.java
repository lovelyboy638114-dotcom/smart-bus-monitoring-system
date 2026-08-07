package com.safebus.bus.service;

import com.safebus.bus.entity.Bus;
import com.safebus.bus.entity.TelemetryLog;
import com.safebus.bus.entity.Alert;
import com.safebus.bus.repository.BusRepository;
import com.safebus.bus.repository.TelemetryLogRepository;
import com.safebus.bus.repository.AlertRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
public class BusService {
    private final BusRepository busRepository;
    private final TelemetryLogRepository telemetryLogRepository;
    private final AlertRepository alertRepository;

    public BusService(BusRepository busRepository,
                      TelemetryLogRepository telemetryLogRepository,
                      AlertRepository alertRepository) {
        this.busRepository = busRepository;
        this.telemetryLogRepository = telemetryLogRepository;
        this.alertRepository = alertRepository;
    }

    public List<Bus> getAllBuses() {
        return busRepository.findAll();
    }

    @Transactional
    public void processTelemetry(String busId, double latitude, double longitude, int speed, double acceleration) {
        // 1. Log incoming telemetry
        TelemetryLog log = TelemetryLog.builder()
                .busId(busId)
                .latitude(latitude)
                .longitude(longitude)
                .speed(speed)
                .acceleration(acceleration)
                .build();
        telemetryLogRepository.save(log);

        // 2. Fetch active bus
        Optional<Bus> busOpt = busRepository.findById(busId);
        if (busOpt.isPresent()) {
            Bus bus = busOpt.get();
            bus.setSpeed(speed);
            bus.setLatitude(latitude);
            bus.setLongitude(longitude);

            // 3. Speed Limit check (Trigger overspeeding alert if exceeded)
            if (speed > bus.getMaxSpeed()) {
                triggerAlert("Overspeeding Detected", "High", busId, bus.getDriver());
            }

            // 4. Deceleration check (Trigger harsh braking alert if abrupt)
            if (acceleration < -3.0) {
                triggerAlert("Harsh Braking Detected", "Medium", busId, bus.getDriver());
            }

            busRepository.save(bus);
        }
    }

    private void triggerAlert(String type, String severity, String busId, String driverName) {
        // Check if there is an active alert of this type for this bus
        Optional<Alert> activeAlert = alertRepository.findByTypeAndBusAndResolved(type, busId, 0);
        if (activeAlert.isEmpty()) {
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("hh:mm a");
            Alert alert = Alert.builder()
                    .type(type)
                    .severity(severity)
                    .bus(busId)
                    .driver(driverName != null ? driverName : "Unknown Driver")
                    .time(LocalDateTime.now().format(dtf))
                    .resolved(0)
                    .build();
            alertRepository.save(alert);
        }
    }
}
