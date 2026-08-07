package com.safebus.bus.repository;

import com.safebus.bus.entity.RouteStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RouteStopRepository extends JpaRepository<RouteStop, Integer> {
    List<RouteStop> findByRouteIdOrderByStopOrderAsc(String routeId);
}
