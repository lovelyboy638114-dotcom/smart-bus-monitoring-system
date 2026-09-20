package com.safebus.student.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class StudentRegistrationRequest {
    @NotBlank(message = "Student name is required")
    private String name;

    @NotBlank(message = "Roll number is required")
    private String rollNo;

    @JsonProperty("class")
    @NotBlank(message = "Class is required")
    private String className;

    private String section = "A";
    private String gender;
    private String dob;
    private String bloodGroup;
    private String address;
    private String medicalNotes;

    @NotBlank(message = "Parent name is required")
    private String parentName;

    @NotBlank(message = "Parent phone is required")
    private String parentPhone;

    @Email(message = "Invalid email format")
    private String parentEmail;

    private String busId;
}
