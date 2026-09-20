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
public class JourneyCompletedEventV1 extends BaseEventV1 {
    private String tripId;
    private String busId;
    private String routeId;
    private String timestampStr;
}
