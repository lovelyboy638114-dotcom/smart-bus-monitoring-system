package com.safebus.student.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentRegistrationResponse {
    private String studentId;
    private String username;
    private String temporaryPassword;
    private boolean mustChangePassword;
    private boolean busAssigned;
    private boolean parentLinked;

    @JsonProperty("student_email")
    private String studentEmail;

    @JsonProperty("student_temp_pass")
    private String studentTempPass;

    @JsonProperty("parent_email")
    private String parentEmail;

    @JsonProperty("parent_temp_pass")
    private String parentTempPass;

    @JsonProperty("parent_reused")
    private boolean parentReused;
}
