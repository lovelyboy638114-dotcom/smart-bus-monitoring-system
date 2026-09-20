package com.safebus.student.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ParentRegistrationResponse {
    private String parentEmail;
    private String parentTempPassword;
    private boolean parentReused;
}
