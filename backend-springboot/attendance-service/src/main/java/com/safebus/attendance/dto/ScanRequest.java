package com.safebus.attendance.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScanRequest {
    private String studentId;
    private String busId;
    private String driverName;
    private String scanTime;
    private String scanDate;
    private Double latitude;
    private Double longitude;
    private String attendanceType; // 'Boarding', 'Dropped'
    private String tripId;
}
