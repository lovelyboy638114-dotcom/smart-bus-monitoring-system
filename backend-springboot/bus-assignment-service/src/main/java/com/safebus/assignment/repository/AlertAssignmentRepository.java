package com.safebus.assignment.repository;

import com.safebus.assignment.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AlertAssignmentRepository extends JpaRepository<Alert, Integer> {
}
