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
public class BusAssignedEventV1 extends BaseEventV1 {
    private String studentId;
    private String busId;
    private String stopId;
    private String routeId;
    private double distance;
}
