package com.safebus.assignment.repository;

import com.safebus.assignment.entity.Stop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StopAssignmentRepository extends JpaRepository<Stop, Integer> {
}
