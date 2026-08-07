package com.safebus.assignment.repository;

import com.safebus.assignment.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteAssignmentRepository extends JpaRepository<Route, String> {
}
