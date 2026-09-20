package com.safebus.auth.account.controller;

import com.safebus.auth.account.dto.LoginRequest;
import com.safebus.auth.account.dto.LoginResponse;
import com.safebus.auth.account.service.AuthService;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Authentication APIs for logging in and managing password credentials")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "User Login Authentication", description = "Validates user login credentials and returns a secure JWT bearer token and user role payload.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Login successful", 
                    content = @Content(schema = @Schema(implementation = LoginResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "Invalid credentials supplied")
    })
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest) {

        String ip = servletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = servletRequest.getRemoteAddr();
        }
        String userAgent = servletRequest.getHeader("User-Agent");
        String browser = extractBrowser(userAgent);
        String device = extractDevice(userAgent);

        String correlationId = UUID.randomUUID().toString();

        try {
            LoginResponse response = authService.login(request, ip, browser, device);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage(), "AUTH_001", correlationId));
        }
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change Password", description = "Allows registered user to update their account credentials securely.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Password changed successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid old password or input values")
    })
    public ResponseEntity<ApiResponse<String>> changePassword(
            @RequestBody Map<String, String> payload,
            HttpServletRequest servletRequest) {

        String username = payload.get("username");
        String currentPassword = payload.get("oldPassword");
        String newPassword = payload.get("newPassword");

        String ip = servletRequest.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = servletRequest.getRemoteAddr();
        }
        String userAgent = servletRequest.getHeader("User-Agent");
        String browser = extractBrowser(userAgent);
        String device = extractDevice(userAgent);

        String correlationId = UUID.randomUUID().toString();

        try {
            authService.changePassword(username, currentPassword, newPassword, ip, browser, device);
            return ResponseEntity.ok(ApiResponse.success("Password changed successfully", "Success", correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage(), "AUTH_003", correlationId));
        }
    }

    private String extractBrowser(String userAgent) {
        if (userAgent == null) return "Unknown";
        if (userAgent.contains("Chrome")) return "Chrome";
        if (userAgent.contains("Firefox")) return "Firefox";
        if (userAgent.contains("Safari") && !userAgent.contains("Chrome")) return "Safari";
        if (userAgent.contains("Edge")) return "Edge";
        return "Other";
    }

    private String extractDevice(String userAgent) {
        if (userAgent == null) return "Unknown";
        if (userAgent.contains("Mobile") || userAgent.contains("Android") || userAgent.contains("iPhone")) {
            return "Mobile";
        }
        return "Desktop";
    }
}
