package com.safebus.student.controller;

import com.safebus.student.service.IDCardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/storage")
public class FileStorageController {
    private final IDCardService idCardService;

    public FileStorageController(IDCardService idCardService) {
        this.idCardService = idCardService;
    }

    @PostMapping("/generate-card")
    public ResponseEntity<Map<String, String>> generateCard(@RequestBody Map<String, Object> studentData) {
        try {
            Map<String, String> paths = idCardService.generateIDCard(studentData);
            return ResponseEntity.ok(paths);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
