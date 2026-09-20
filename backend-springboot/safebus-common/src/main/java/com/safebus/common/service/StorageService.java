package com.safebus.common.service;

import java.io.IOException;

public interface StorageService {
    String storeFile(byte[] bytes, String subDirectory, String fileName) throws IOException;
    byte[] loadFile(String filePath) throws IOException;
}
