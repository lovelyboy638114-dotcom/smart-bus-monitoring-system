package com.safebus.notification.consumer;

import com.safebus.notification.entity.ParentNotificationLog;
import com.safebus.notification.repository.ParentNotificationLogRepository;
import com.safebus.common.dto.response.ApiResponse;
import com.safebus.common.dto.WebSocketMessage;
import com.safebus.notification.websocket.WebSocketAlertHandler;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Component
public class AttendanceEventConsumer {
    private final ParentNotificationLogRepository logRepository;
    private final RestTemplate restTemplate;
    private final WebSocketAlertHandler webSocketAlertHandler;

    @Value("${services.student.url:http://127.0.0.1:8082}")
    private String studentServiceUrl;

    public AttendanceEventConsumer(ParentNotificationLogRepository logRepository, RestTemplate restTemplate, WebSocketAlertHandler webSocketAlertHandler) {
        this.logRepository = logRepository;
        this.restTemplate = restTemplate;
        this.webSocketAlertHandler = webSocketAlertHandler;
    }

    @RabbitListener(queues = "attendance-queue")
    public void consumeAttendanceEvent(Map<String, Object> payload) {
        try {
            String studentId = (String) payload.get("studentId");
            String busId = (String) payload.get("busId");
            String scanTime = (String) payload.get("scanTime");
            String type = (String) payload.get("attendanceType"); // Boarding, Dropped

            System.out.println("[Notification Consumer] Received scan event. Student: " + studentId + ", Bus: " + busId + ", Type: " + type);

            // Fetch Student Details from Student Service REST Lookup
            String studentUrl = studentServiceUrl + "/api/v1/students/" + studentId;
            String parentPhone = "Unknown Phone";
            String parentEmail = "Unknown Email";
            String studentName = "Student";

            try {
                ApiResponse<?> response = restTemplate.getForObject(studentUrl, ApiResponse.class);
                if (response != null && response.isSuccess()) {
                    Map<?, ?> studentMap = (Map<?, ?>) response.getData();
                    studentName = (String) studentMap.get("name");
                    parentPhone = (String) studentMap.get("parentPhone");
                    parentEmail = (String) studentMap.get("schoolEmail"); // Or fallback
                }
            } catch (Exception e) {
                System.err.println("[Notification Consumer] Failed to fetch student details from student-service: " + e.getMessage());
            }

            // Update Student Boarding Status in Student Service
            try {
                String updateUrl = studentServiceUrl + "/api/v1/students/" + studentId + "/board?boardingType=" + type + "&scanTime=" + scanTime;
                restTemplate.put(updateUrl, null);
                System.out.println("[Notification Consumer] Updated student boarding status in student-service.");
            } catch (Exception e) {
                System.err.println("[Notification Consumer] Failed to update boarding status in student-service: " + e.getMessage());
            }

            // Simulate dispatching Email & SMS notification to parent
            String smsText = "Dear Parent, your child " + studentName + " has successfully " +
                    (type.equalsIgnoreCase("boarded") || type.equalsIgnoreCase("boarding") ? "boarded" : "been dropped from") +
                    " bus " + busId + " at " + scanTime + ".";

            System.out.println("[SMS Dispatch] To Parent Phone: " + parentPhone + " -> Message: \"" + smsText + "\"");
            System.out.println("[Email Dispatch] To Parent Email: " + parentEmail + " -> Subject: Student Attendance Update");

            // Write delivery log to database
            ParentNotificationLog smsLog = ParentNotificationLog.builder()
                    .studentId(studentId)
                    .notificationType(type.toUpperCase() + "_ALERT")
                    .deliveryMethod("SMS")
                    .status("SENT")
                    .build();
            logRepository.save(smsLog);

            ParentNotificationLog emailLog = ParentNotificationLog.builder()
                    .studentId(studentId)
                    .notificationType(type.toUpperCase() + "_ALERT")
                    .deliveryMethod("Email")
                    .status("SENT")
                    .build();
            logRepository.save(emailLog);

            // Broadcast to WebSockets
            WebSocketMessage msg = WebSocketMessage.builder()
                    .type("ATTENDANCE")
                    .event("ATTENDANCE_" + type.toUpperCase())
                    .severity("LOW")
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                    .correlationId(UUID.randomUUID().toString())
                    .payload(payload)
                    .build();
            webSocketAlertHandler.broadcast(msg);

        } catch (Exception e) {
            System.err.println("[Notification Error] Failed to process attendance event: " + e.getMessage());
        }
    }
}
