package com.safebus.sos.repository;

import com.safebus.sos.entity.SosAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SosAuditLogRepository extends JpaRepository<SosAuditLog, Integer> {
    List<SosAuditLog> findBySosIdOrderByTimestampAsc(String sosId);
}
