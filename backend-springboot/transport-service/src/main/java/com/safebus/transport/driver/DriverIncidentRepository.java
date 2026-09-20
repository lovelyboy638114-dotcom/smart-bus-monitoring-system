package com.safebus.transport.driver;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DriverIncidentRepository extends JpaRepository<DriverIncident, Long> {
    List<DriverIncident> findByDriverId(String driverId);
    List<DriverIncident> findByBusId(String busId);
}
