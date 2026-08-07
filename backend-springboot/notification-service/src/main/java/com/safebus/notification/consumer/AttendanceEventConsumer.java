package com.safebus.notification.consumer;

import com.safebus.notification.entity.ParentNotificationLog;
import com.safebus.notification.repository.ParentNotificationLogRepository;
import com.safebus.common.dto.response.ApiResponse;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Component
public class AttendanceEventConsumer {
    private final ParentNotificationLogRepository logRepository;
    private final RestTemplate restTemplate;

    public AttendanceEventConsumer(ParentNotificationLogRepository logRepository, RestTemplate restTemplate) {
        this.logRepository = logRepository;
        this.restTemplate = restTemplate;
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
            String studentUrl = "http://student-service/api/v1/students/" + studentId;
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

            // Simulate dispatching Email & SMS notification to parent
            String smsText = "Dear Parent, your child " + studentName + " has successfully " +
                    (type.equalsIgnoreCase("boarding") ? "boarded" : "been dropped from") +
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

        } catch (Exception e) {
            System.err.println("[Notification Error] Failed to process attendance event: " + e.getMessage());
        }
    }
}
