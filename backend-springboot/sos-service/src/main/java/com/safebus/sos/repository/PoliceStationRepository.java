package com.safebus.sos.repository;

import com.safebus.sos.entity.PoliceStation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PoliceStationRepository extends JpaRepository<PoliceStation, Integer> {
}
