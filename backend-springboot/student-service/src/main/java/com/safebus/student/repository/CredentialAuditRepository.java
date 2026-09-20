package com.safebus.student.repository;

import com.safebus.student.entity.CredentialAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CredentialAuditRepository extends JpaRepository<CredentialAudit, Integer> {
}
