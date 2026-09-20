package com.safebus.common.model;

public enum CvProcessingState {
    PROCESSING,
    FACE_NOT_FOUND,
    CAMERA_OFFLINE,
    MODEL_LOADING,
    NORMAL,
    WARNING,
    CRITICAL
}
