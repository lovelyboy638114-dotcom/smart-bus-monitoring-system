package com.safebus.student.entity;

public enum IdCardFailureCode {
    PHOTO_NOT_FOUND,
    QR_FAILED,
    PDF_FAILED,
    CHECKSUM_FAILED,
    TEMPLATE_NOT_FOUND,
    STORAGE_ERROR,
    UNKNOWN
}
