package com.safebus.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DriverRegistrationRequest {
    @NotBlank(message = "Driver name is required")
    private String name;

    @NotBlank(message = "Driver ID is required")
    private String driverId;

    private String licenseNo;
    private Integer experienceYears;
    private String phone;
    private String busRoute;
}
