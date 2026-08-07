package com.safebus.common.exception;

public enum ErrorCode {
    AUTH_001("Invalid Credentials"),
    AUTH_002("JWT Expired"),
    AUTH_003("Unauthorized"),
    STU_001("Student Not Found"),
    STU_002("Duplicate Roll Number"),
    BUS_001("Bus Full"),
    BUS_002("Route Not Found"),
    FILE_001("Upload Failed"),
    SOS_001("Emergency Already Active");

    private final String defaultMessage;

    ErrorCode(String defaultMessage) {
        this.defaultMessage = defaultMessage;
    }

    public String getDefaultMessage() {
        return defaultMessage;
    }
}
