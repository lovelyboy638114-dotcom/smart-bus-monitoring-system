package com.safebus.student.repository;

import com.safebus.student.entity.SosAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SosAuditLogRepository extends JpaRepository<SosAuditLog, Integer> {
    List<SosAuditLog> findBySosIdOrderByTimestampAsc(String sosId);
}
