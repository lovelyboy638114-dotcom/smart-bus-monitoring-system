package com.safebus.student.repository;

import com.safebus.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    List<Student> findByParentId(Integer parentId);
    Optional<Student> findByStudentIdCode(String studentIdCode);
    Optional<Student> findByAdmissionNo(String admissionNo);
}
