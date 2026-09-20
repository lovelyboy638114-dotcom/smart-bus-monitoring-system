package com.safebus.common.dto.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
public class DriverIncidentEventV1 extends BaseEventV1 {
    private String driverId;
    private String busId;
    private String routeId;
    private String tripId;
    private String incidentType;
    private double confidence;
    private String imagePath;
    private String videoPath;
    private double latitude;
    private double longitude;
    private double speed;
    private String status;
}
