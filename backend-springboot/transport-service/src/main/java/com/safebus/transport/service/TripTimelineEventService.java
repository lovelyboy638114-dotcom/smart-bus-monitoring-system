package com.safebus.transport.service;

import com.safebus.common.model.JourneyEventType;
import com.safebus.transport.entity.TripTimelineEvent;
import com.safebus.transport.repository.TripTimelineEventRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.HashMap;
import java.util.Map;

@Service
public class TripTimelineEventService {
    private final TripTimelineEventRepository eventRepository;
    private final RabbitTemplate rabbitTemplate;

    public TripTimelineEventService(TripTimelineEventRepository eventRepository, RabbitTemplate rabbitTemplate) {
        this.eventRepository = eventRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public TripTimelineEvent recordEvent(String tripId, String busId, String studentId,
                                         JourneyEventType eventType, String location,
                                         Double latitude, Double longitude, String createdBy) {
        TripTimelineEvent event = TripTimelineEvent.builder()
                .tripId(tripId)
                .busId(busId)
                .studentId(studentId)
                .eventType(eventType)
                .location(location)
                .latitude(latitude)
                .longitude(longitude)
                .timestamp(LocalDateTime.now())
                .createdBy(createdBy)
                .build();

        TripTimelineEvent saved = eventRepository.save(event);

        // Publish event to RabbitMQ
        Map<String, Object> payload = new HashMap<>();
        payload.put("eventId", UUID.randomUUID().toString());
        payload.put("correlationId", UUID.randomUUID().toString());
        payload.put("timestamp", LocalDateTime.now().toString());
        payload.put("tripId", tripId);
        payload.put("busId", busId);
        payload.put("studentId", studentId);
        payload.put("eventType", eventType.name());
        payload.put("location", location);
        payload.put("latitude", latitude);
        payload.put("longitude", longitude);

        String routingKey = "journey.event";
        if (eventType == JourneyEventType.BUS_STARTED) {
            routingKey = "journey.started";
        } else if (eventType == JourneyEventType.JOURNEY_COMPLETED) {
            routingKey = "journey.completed";
        }

        try {
            rabbitTemplate.convertAndSend("transport.exchange", routingKey, payload);
            System.out.println("[Timeline Service] Published timeline event to RabbitMQ: " + eventType + " -> " + routingKey);
        } catch (Exception e) {
            System.err.println("[Timeline Service] Failed to publish timeline event to RabbitMQ: " + e.getMessage());
        }

        return saved;
    }

    public List<TripTimelineEvent> getEventsForTrip(String tripId) {
        return eventRepository.findByTripIdOrderByTimestampAsc(tripId);
    }

    public List<TripTimelineEvent> getEventsForBus(String busId) {
        return eventRepository.findByBusIdOrderByTimestampAsc(busId);
    }
}
