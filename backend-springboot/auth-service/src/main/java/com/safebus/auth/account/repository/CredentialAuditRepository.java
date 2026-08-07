package com.safebus.auth.account.repository;

import com.safebus.auth.account.entity.CredentialAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CredentialAuditRepository extends JpaRepository<CredentialAudit, Integer> {
    List<CredentialAudit> findByAccountId(Integer accountId);
}
