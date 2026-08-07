package com.safebus.student.controller;

import com.safebus.student.entity.Parent;
import com.safebus.student.entity.Student;
import com.safebus.student.service.StudentService;
import com.safebus.common.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/parent/profile")
    public ResponseEntity<ApiResponse<Parent>> getParentProfile(
            @RequestHeader(value = "X-User-Name", required = false) String gatewayUsername,
            @RequestParam(value = "username", required = false) String paramUsername) {

        String username = (gatewayUsername != null) ? gatewayUsername : paramUsername;
        String correlationId = UUID.randomUUID().toString();

        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Username is required", "STU_002", correlationId));
        }

        try {
            Parent parent = studentService.resolveParent(username);
            return ResponseEntity.ok(ApiResponse.success("Parent profile retrieved", parent, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @GetMapping("/parent/children")
    public ResponseEntity<ApiResponse<List<Student>>> getChildren(
            @RequestHeader(value = "X-User-Name", required = false) String gatewayUsername,
            @RequestParam(value = "username", required = false) String paramUsername) {

        String username = (gatewayUsername != null) ? gatewayUsername : paramUsername;
        String correlationId = UUID.randomUUID().toString();

        if (username == null || username.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Username is required", "STU_002", correlationId));
        }

        try {
            List<Student> children = studentService.getChildrenByParent(username);
            return ResponseEntity.ok(ApiResponse.success("Children profiles retrieved", children, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Student>> getStudentById(@PathVariable String id) {
        String correlationId = UUID.randomUUID().toString();
        Optional<Student> studentOpt = studentService.getStudentById(id);
        if (studentOpt.isPresent()) {
            return ResponseEntity.ok(ApiResponse.success("Student retrieved", studentOpt.get(), correlationId));
        } else {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error("Student not found", "STU_001", correlationId));
        }
    }

    @PostMapping("/{studentId}/regenerate-id-card")
    public ResponseEntity<ApiResponse<Student>> regenerateIdCard(@PathVariable String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student updatedStudent = studentService.regenerateIdCard(studentId);
            return ResponseEntity.ok(ApiResponse.success("ID Card generated successfully", updatedStudent, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "FILE_001", correlationId));
        }
    }

    @PutMapping("/{studentId}/assign-bus")
    public ResponseEntity<ApiResponse<Student>> assignBusToStudent(
            @PathVariable String studentId,
            @RequestParam String busId,
            @RequestParam String status) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student student = studentService.updateStudentBusAssignment(studentId, busId, status);
            return ResponseEntity.ok(ApiResponse.success("Student bus assignment updated", student, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @GetMapping("/assigned-count")
    public ResponseEntity<ApiResponse<Long>> getAssignedCount(@RequestParam String busId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            long count = studentService.getAssignedCount(busId);
            return ResponseEntity.ok(ApiResponse.success("Assigned student count retrieved", count, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }
}
