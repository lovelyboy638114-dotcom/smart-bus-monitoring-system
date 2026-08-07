package com.safebus.bus.repository;

import com.safebus.bus.entity.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StopRepository extends JpaRepository<Stop, Integer> {
    List<Stop> findByRouteId(String routeId);
}
