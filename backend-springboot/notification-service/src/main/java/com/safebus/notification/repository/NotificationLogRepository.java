package com.safebus.notification.repository;

import com.safebus.notification.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Integer> {
    List<NotificationLog> findBySosIdOrderBySentAtDesc(String sosId);
}
