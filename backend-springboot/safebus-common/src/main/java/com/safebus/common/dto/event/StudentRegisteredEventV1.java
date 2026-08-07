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
public class StudentRegisteredEventV1 extends BaseEventV1 {
    private String studentId;
    private String name;
    private String address;
    private String parentPhone;
}
