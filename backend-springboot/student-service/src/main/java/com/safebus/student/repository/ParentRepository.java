package com.safebus.student.repository;

import com.safebus.student.entity.Parent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ParentRepository extends JpaRepository<Parent, Integer> {
    Optional<Parent> findByUsername(String username);
}
