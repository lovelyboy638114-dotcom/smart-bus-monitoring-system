package com.safebus.transport.repository;

import com.safebus.transport.entity.TripTimelineEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TripTimelineEventRepository extends JpaRepository<TripTimelineEvent, Long> {
    List<TripTimelineEvent> findByTripIdOrderByTimestampAsc(String tripId);
    List<TripTimelineEvent> findByBusIdOrderByTimestampAsc(String busId);
}
