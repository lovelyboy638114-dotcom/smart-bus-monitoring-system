package com.safebus.notification.repository;

import com.safebus.notification.entity.ParentNotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ParentNotificationLogRepository extends JpaRepository<ParentNotificationLog, Integer> {
    List<ParentNotificationLog> findByStudentIdOrderBySentAtDesc(String studentId);
}
