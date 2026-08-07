package com.safebus.bus.repository;

import com.safebus.bus.entity.Bus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusRepository extends JpaRepository<Bus, String> {
}
