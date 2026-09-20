package com.safebus.transport.controller;

import com.safebus.common.dto.response.ApiResponse;
import com.safebus.common.model.JourneyEventType;
import com.safebus.transport.entity.TripTimelineEvent;
import com.safebus.transport.service.TripTimelineEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/trips/timeline")
@Tag(name = "Timeline", description = "Trip journey timeline event tracking and query log APIs")
public class TimelineController {
    private final TripTimelineEventService timelineService;

    public TimelineController(TripTimelineEventService timelineService) {
        this.timelineService = timelineService;
    }

    @PostMapping("/event")
    @Operation(summary = "Record Timeline Event", description = "Log a new journey stage transition (e.g. Bus Started, Reached Stop, Traffic Delay) for a specific bus trip.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Timeline event logged successfully")
    })
    public ResponseEntity<ApiResponse<TripTimelineEvent>> recordEvent(@RequestBody Map<String, Object> req) {
        String tripId = (String) req.getOrDefault("tripId", "T-DEFAULT");
        String busId = (String) req.getOrDefault("busId", "B-DEFAULT");
        String studentId = (String) req.get("studentId");
        String eventTypeStr = (String) req.getOrDefault("eventType", "REACHED_STOP");
        String location = (String) req.get("location");
        Double latitude = req.get("latitude") != null ? Double.valueOf(req.get("latitude").toString()) : null;
        Double longitude = req.get("longitude") != null ? Double.valueOf(req.get("longitude").toString()) : null;
        String createdBy = (String) req.getOrDefault("createdBy", "System");

        JourneyEventType eventType;
        try {
            eventType = JourneyEventType.valueOf(eventTypeStr.toUpperCase());
        } catch (Exception e) {
            eventType = JourneyEventType.REACHED_STOP;
        }

        TripTimelineEvent event = timelineService.recordEvent(
                tripId, busId, studentId, eventType, location, latitude, longitude, createdBy
        );

        ApiResponse<TripTimelineEvent> res = ApiResponse.<TripTimelineEvent>builder()
                .success(true)
                .message("Timeline event recorded successfully")
                .data(event)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<ApiResponse<List<TripTimelineEvent>>> getEventsByTrip(@PathVariable("tripId") String tripId) {
        List<TripTimelineEvent> list = timelineService.getEventsForTrip(tripId);
        ApiResponse<List<TripTimelineEvent>> res = ApiResponse.<List<TripTimelineEvent>>builder()
                .success(true)
                .message("Timeline events retrieved successfully")
                .data(list)
                .build();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/bus/{busId}")
    public ResponseEntity<ApiResponse<List<TripTimelineEvent>>> getEventsByBus(@PathVariable("busId") String busId) {
        List<TripTimelineEvent> list = timelineService.getEventsForBus(busId);
        ApiResponse<List<TripTimelineEvent>> res = ApiResponse.<List<TripTimelineEvent>>builder()
                .success(true)
                .message("Timeline events retrieved successfully")
                .data(list)
                .build();
        return ResponseEntity.ok(res);
    }
}
