package com.safebus.student.controller;

import com.safebus.student.service.IDCardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/storage")
@Tag(name = "Storage", description = "File storage and dynamic PDF ID Card generation APIs")
public class FileStorageController {
    private final IDCardService idCardService;

    public FileStorageController(IDCardService idCardService) {
        this.idCardService = idCardService;
    }

    @PostMapping("/generate-card")
    @Operation(summary = "Generate ID Card Badge", description = "Asynchronously renders front/back images and compiles printable PDF ID cards to local storage path locations.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "ID Card generated successfully"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "500", description = "Drawing or file system compilation error")
    })
    public ResponseEntity<Map<String, String>> generateCard(@RequestBody Map<String, Object> studentData) {
        try {
            String studentId = (String) studentData.get("id");
            if (studentId == null || studentId.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Student ID is required"));
            }
            Map<String, String> paths = idCardService.generateIDCard(studentId, java.util.UUID.randomUUID().toString());
            return ResponseEntity.ok(paths);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
