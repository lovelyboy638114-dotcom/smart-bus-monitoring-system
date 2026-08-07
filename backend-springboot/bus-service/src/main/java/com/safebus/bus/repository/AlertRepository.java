package com.safebus.bus.repository;

import com.safebus.bus.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Integer> {
    List<Alert> findByBusAndResolved(String bus, int resolved);
    Optional<Alert> findByTypeAndBusAndResolved(String type, String bus, int resolved);
}
