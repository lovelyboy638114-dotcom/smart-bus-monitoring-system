package com.safebus.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDto {
    private String id;
    private String name;
    private String rollNo;
    private String className;
    private String section;
    private String busId;
    private String routeId;
    private String status;
    private String assignmentStatus;
    private String address;
    private String parentName;
    private String parentPhone;
}
