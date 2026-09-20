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
public class SOSRaisedEventV1 extends BaseEventV1 {
    private String sosId;
    private String busId;
    private String driverId;
    private String emergencyType;
    private double latitude;
    private double longitude;
    private String status;
}
