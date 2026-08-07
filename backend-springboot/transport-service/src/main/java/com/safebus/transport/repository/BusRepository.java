package com.safebus.transport.repository;

import com.safebus.transport.entity.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusRepository extends JpaRepository<Bus, String> {
    List<Bus> findByRouteAndStatus(String route, String status);
    List<Bus> findByRoute(String route);
}
