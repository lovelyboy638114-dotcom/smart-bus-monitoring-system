package com.safebus.assignment.repository;

import com.safebus.assignment.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentAssignmentRepository extends JpaRepository<Student, String> {
    long countByBusIdAndStudentStatus(String busId, String studentStatus);
}
