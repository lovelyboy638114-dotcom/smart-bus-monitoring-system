package com.safebus.bus.repository;

import com.safebus.bus.entity.TelemetryLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TelemetryLogRepository extends JpaRepository<TelemetryLog, Integer> {
    List<TelemetryLog> findByBusIdOrderByTimestampDesc(String busId);
}
