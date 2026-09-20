package com.safebus.transport.event;

import com.safebus.common.dto.event.DriverIncidentEventV1;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class DriverIncidentListener {
    private final RabbitTemplate rabbitTemplate;

    public DriverIncidentListener(RabbitTemplate rabbitTemplate) {
        this.rabbitTemplate = rabbitTemplate;
    }

    @Async
    @EventListener
    public void handleDriverIncidentCreatedEvent(DriverIncidentCreatedEvent event) {
        DriverIncidentEventV1 dto = event.getEventDto();
        String routingKey = "driver.alert.incident";
        if (dto.getIncidentType() != null) {
            String type = dto.getIncidentType().toLowerCase().replace("_", "");
            if (type.equals("drowsy") || type.equals("drowsiness")) {
                routingKey = "driver.alert.drowsy";
            } else if (type.equals("phoneusage") || type.equals("phone")) {
                routingKey = "driver.alert.phone";
            } else if (type.equals("yawning")) {
                routingKey = "driver.alert.yawning";
            }
        }
        try {
            rabbitTemplate.convertAndSend("driver.exchange", routingKey, dto);
            System.out.println("[Event Listener] Successfully enqueued DriverIncidentEvent to RabbitMQ. RoutingKey: " + routingKey);
        } catch (Exception e) {
            System.err.println("[Event Listener] Failed to publish DriverIncidentEvent to RabbitMQ: " + e.getMessage());
        }
    }
}
