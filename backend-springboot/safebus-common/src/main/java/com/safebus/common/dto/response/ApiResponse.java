package com.safebus.common.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Standard API response wrapper envelope used across all microservices")
public class ApiResponse<T> {
    @Schema(description = "Indicates whether the request operation succeeded", example = "true")
    private boolean success;

    @Schema(description = "Detail message explaining the outcome of the request", example = "Operation completed successfully")
    private String message;

    @Schema(description = "The payload data returned from the endpoint execution")
    private T data;

    @Schema(description = "Standard system error code (null on success)", example = "AUTH_001")
    private String errorCode;

    @Schema(description = "Timestamp when response was generated", example = "2026-08-08T09:18:00")
    private LocalDateTime timestamp;

    @Schema(description = "Unique trace token identifying the E2E transaction flow", example = "8f3d6c7b-1a2c-4e5f-8d9e-0a1b2c3d4e5f")
    private String correlationId;

    public static <T> ApiResponse<T> success(String message, T data, String correlationId) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .correlationId(correlationId)
                .build();
    }

    public static <T> ApiResponse<T> error(String message, String errorCode, String correlationId) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .timestamp(LocalDateTime.now())
                .correlationId(correlationId)
                .build();
    }
}
