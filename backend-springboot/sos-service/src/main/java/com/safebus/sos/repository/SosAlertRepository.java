package com.safebus.sos.repository;

import com.safebus.sos.entity.SosAlert;
import com.safebus.sos.entity.SosStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SosAlertRepository extends JpaRepository<SosAlert, Integer> {

    @Query("SELECT s FROM SosAlert s WHERE s.busId = :busId AND s.status IN :statuses AND s.deletedAt IS NULL")
    Optional<SosAlert> findActiveByBusId(
            @Param("busId") String busId,
            @Param("statuses") List<SosStatus> statuses);

    @Query("SELECT s FROM SosAlert s WHERE s.busId = :busId AND s.createdAt >= :timeLimit ORDER BY s.createdAt DESC")
    List<SosAlert> findRecentByBusId(
            @Param("busId") String busId,
            @Param("timeLimit") LocalDateTime timeLimit);

    List<SosAlert> findByStatusInAndDeletedAtIsNull(List<SosStatus> statuses);

    List<SosAlert> findByStatusAndDeletedAtIsNullOrderByResolvedAtDesc(SosStatus status);

    long countByCreatedAtGreaterThanEqual(LocalDateTime time);
}
