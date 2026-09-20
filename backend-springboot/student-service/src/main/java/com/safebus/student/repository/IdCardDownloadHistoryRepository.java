package com.safebus.student.repository;

import com.safebus.student.entity.IdCardDownloadHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IdCardDownloadHistoryRepository extends JpaRepository<IdCardDownloadHistory, Long> {
}
