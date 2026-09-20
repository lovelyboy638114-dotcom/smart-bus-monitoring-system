package com.safebus.student.controller;

import com.safebus.common.dto.response.ApiResponse;
import com.safebus.student.dto.*;
import com.safebus.student.service.AdminRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Registration & Provisioning", description = "Administration endpoints for registering students, parents, drivers, and resetting credentials")
public class AdminRegistrationController {

    private final AdminRegistrationService adminRegistrationService;

    public AdminRegistrationController(AdminRegistrationService adminRegistrationService) {
        this.adminRegistrationService = adminRegistrationService;
    }

    @PostMapping("/students")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register/Provision Student", description = "Creates a student and parent profile, assigns closest route bus, and publishes credentials.")
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Student registered successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Invalid payload or validation failed"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Duplicate student roll number/admission number")
    })
    public ResponseEntity<ApiResponse<StudentRegistrationResponse>> registerStudent(
            @Valid @RequestBody StudentRegistrationRequest request) {
        String correlationId = UUID.randomUUID().toString();
        StudentRegistrationResponse response = adminRegistrationService.registerStudent(request);
        return ResponseEntity.ok(ApiResponse.success("Student registered successfully", response, correlationId));
    }

    @PostMapping("/drivers")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register/Provision Driver", description = "Creates a driver account and links them to their active bus route.")
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Driver registered successfully")
    })
    public ResponseEntity<ApiResponse<DriverRegistrationResponse>> registerDriver(
            @Valid @RequestBody DriverRegistrationRequest request) {
        String correlationId = UUID.randomUUID().toString();
        DriverRegistrationResponse response = adminRegistrationService.registerDriver(request);
        return ResponseEntity.ok(ApiResponse.success("Driver registered successfully", response, correlationId));
    }

    @PostMapping("/parents")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Register Standalone Parent", description = "Creates a parent profile in isolation and links to student ID if provided.")
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Parent registered successfully")
    })
    public ResponseEntity<ApiResponse<ParentRegistrationResponse>> registerParent(
            @Valid @RequestBody ParentRegistrationRequest request) {
        String correlationId = UUID.randomUUID().toString();
        ParentRegistrationResponse response = adminRegistrationService.registerParent(request);
        return ResponseEntity.ok(ApiResponse.success("Parent registered successfully", response, correlationId));
    }

    @PostMapping("/accounts/{username}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Reset Account Password", description = "Resets user password to a temporary 12-char secure password.")
    @SecurityRequirement(name = "Bearer Authentication")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Temporary password reset successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "404", description = "Account not found")
    })
    public ResponseEntity<ApiResponse<PasswordResetResponse>> resetPassword(
            @Parameter(description = "Account username email", example = "2026STD0001.student@happyjourney.ai")
            @PathVariable("username") String username) {
        String correlationId = UUID.randomUUID().toString();
        PasswordResetResponse response = adminRegistrationService.resetPassword(username);
        return ResponseEntity.ok(ApiResponse.success("Temporary password reset successfully", response, correlationId));
    }
}
