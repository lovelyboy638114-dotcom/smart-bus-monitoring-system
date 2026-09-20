package com.safebus.auth.account.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "JWT authentication response payload containing tokens and user session details")
public class LoginResponse {
    @Schema(description = "JWT Access Token for authorization", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcyMzExNzYwMCwiZXhwIjoxNzIzMTIxMjAwfQ...")
    private String token;

    @Schema(description = "Refresh Token for renewing access tokens", example = "8f3d6c7b-1a2c-4e5f-8d9e-0a1b2c3d4e5f")
    private String refreshToken;

    @Schema(description = "User role authority level", example = "ADMIN")
    private String role;

    @Schema(description = "Account username or email", example = "admin@safebus.com")
    private String username;

    @Schema(description = "User display full name", example = "Sathish Kumar")
    private String fullName;

    @Schema(description = "Flag stating if user must change password on login", example = "false")
    private boolean mustChangePassword;
}
