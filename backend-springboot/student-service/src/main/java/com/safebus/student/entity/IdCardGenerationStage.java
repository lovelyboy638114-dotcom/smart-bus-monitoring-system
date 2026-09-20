package com.safebus.student.entity;

public enum IdCardGenerationStage {
    QUEUED,
    GENERATING_QR,
    GENERATING_FRONT,
    GENERATING_BACK,
    GENERATING_PDF,
    VERIFYING,
    COMPLETED,
    FAILED
}
