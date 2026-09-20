package com.safebus.transport.event;

import com.safebus.common.dto.event.DriverIncidentEventV1;
import org.springframework.context.ApplicationEvent;

public class DriverIncidentCreatedEvent extends ApplicationEvent {
    private final DriverIncidentEventV1 eventDto;

    public DriverIncidentCreatedEvent(Object source, DriverIncidentEventV1 eventDto) {
        super(source);
        this.eventDto = eventDto;
    }

    public DriverIncidentEventV1 getEventDto() {
        return eventDto;
    }
}
