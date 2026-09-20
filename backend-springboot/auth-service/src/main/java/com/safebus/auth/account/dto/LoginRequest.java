package com.safebus.auth.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "User credential details for login authentication")
public class LoginRequest {
    @NotBlank(message = "Username is required")
    @Schema(description = "Username or school email address", example = "admin@safebus.com")
    private String username;

    @NotBlank(message = "Password is required")
    @Schema(description = "User account password", example = "admin123")
    private String password;
}
