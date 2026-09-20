package com.safebus.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ParentRegistrationRequest {
    @NotBlank(message = "Parent name is required")
    private String parentName;

    @NotBlank(message = "Phone is required")
    private String phone;

    private String email;
    private String address;
    private String studentId;
}
