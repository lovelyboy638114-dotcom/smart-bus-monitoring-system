package com.safebus.attendance.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request body payload for recording a student boarding/dropping RFID/QR scan event")
public class ScanRequest {
    @Schema(description = "Registered student ID, roll number, or identifier", example = "STU001")
    private String studentId;

    @Schema(description = "Identifier of the bus where the scan occurred", example = "TN38AB1234")
    private String busId;

    @Schema(description = "Name of the driver operating the trip", example = "Murugan")
    private String driverName;

    @Schema(description = "Time of scan", example = "08:15 AM")
    private String scanTime;

    @Schema(description = "Date of scan (YYYY-MM-DD)", example = "2026-08-08")
    private String scanDate;

    @Schema(description = "GPS latitude coordinates of the boarding event location", example = "10.8801")
    private Double latitude;

    @Schema(description = "GPS longitude coordinates of the boarding event location", example = "77.0224")
    private Double longitude;

    @Schema(description = "Scanning transition phase type (e.g. Boarded, Dropped)", example = "Boarded")
    private String attendanceType;

    @Schema(description = "Unique trip sequence identifier", example = "TRIP-01")
    private String tripId;
}
