package com.safebus.student.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PasswordResetResponse {
    private String username;
    private String temporaryPassword;
    private boolean mustChangePassword;
}
