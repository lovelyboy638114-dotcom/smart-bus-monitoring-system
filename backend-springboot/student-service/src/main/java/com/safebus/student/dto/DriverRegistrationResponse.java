package com.safebus.student.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DriverRegistrationResponse {
    private String driverEmail;
    private String driverTempPassword;
}
