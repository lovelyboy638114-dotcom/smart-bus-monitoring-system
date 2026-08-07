package com.safebus.attendance.repository;

import com.safebus.attendance.entity.StudentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StudentEventRepository extends JpaRepository<StudentEvent, Integer> {
    List<StudentEvent> findByStudentIdOrderByCreatedAtDesc(String studentId);
}
