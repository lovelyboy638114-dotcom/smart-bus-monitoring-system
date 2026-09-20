package com.safebus.student.service;

import java.io.IOException;

public interface IdCardStorageService {
    String storeFile(byte[] bytes, String subDirectory, String fileName) throws IOException;
    byte[] loadFile(String filePath) throws IOException;
    void validateDiskSpace() throws IOException;
    void cleanTempFiles(int retentionHours);
}
