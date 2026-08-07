package com.safebus.assignment.repository;

import com.safebus.assignment.entity.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BusAssignmentRepository extends JpaRepository<Bus, String> {
    List<Bus> findByRouteIdAndIsActive(String routeId, boolean isActive);
}
