package com.safebus.student.controller;

import com.safebus.student.entity.Parent;
import com.safebus.student.entity.Student;
import com.safebus.student.service.StudentService;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.safebus.student.dto.StudentRegistrationRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/students")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    @Operation(summary = "Get All Students", description = "Query detailed registration profile lists for all students.")
    public ResponseEntity<List<Student>> getAllStudents() {
        return ResponseEntity.ok(studentService.getAllStudents());
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
    public ResponseEntity<ApiResponse<Student>> getStudentById(@PathVariable("id") String id) {
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
    public ResponseEntity<ApiResponse<Student>> regenerateIdCard(@PathVariable("studentId") String studentId) {
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
            @PathVariable("studentId") String studentId,
            @RequestParam("busId") String busId,
            @RequestParam("status") String status) {
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
    public ResponseEntity<ApiResponse<Long>> getAssignedCount(@RequestParam("busId") String busId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            long count = studentService.getAssignedCount(busId);
            return ResponseEntity.ok(ApiResponse.success("Assigned student count retrieved", count, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @PutMapping("/{studentId}/board")
    @Operation(summary = "Update Student Boarding/Transit Status", description = "Updates student boarded, boardedTime, reachedSchool, etc. fields when a scan occurs.")
    public ResponseEntity<ApiResponse<Student>> updateBoardingStatus(
            @PathVariable("studentId") String studentId,
            @RequestParam("boardingType") String boardingType,
            @RequestParam(value = "scanTime", required = false) String scanTime) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student updated = studentService.updateBoardingStatus(studentId, boardingType, scanTime);
            return ResponseEntity.ok(ApiResponse.success("Boarding status updated successfully", updated, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to update boarding status: " + e.getMessage(), "BOARD_500", correlationId));
        }
    }

    @PutMapping("/{studentId}/profile")
    @Operation(summary = "Update Student Profile Details", description = "Updates medical notes, blood group, and home address.")
    public ResponseEntity<ApiResponse<Student>> updateProfile(
            @PathVariable("studentId") String studentId,
            @RequestBody Map<String, String> payload) {
        String correlationId = UUID.randomUUID().toString();
        try {
            String bloodGroup = payload.get("bloodGroup");
            String address = payload.get("address");
            String medicalNotes = payload.get("medicalNotes");
            Student updated = studentService.updateStudentProfile(studentId, bloodGroup, address, medicalNotes);
            return ResponseEntity.ok(ApiResponse.success("Student profile updated successfully", updated, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update Student Registration", description = "Updates student profile information.")
    public ResponseEntity<ApiResponse<Student>> updateStudent(
            @PathVariable("id") String id,
            @RequestBody StudentRegistrationRequest request) {
        String correlationId = UUID.randomUUID().toString();
        try {
            Student updated = studentService.updateStudent(id, request);
            return ResponseEntity.ok(ApiResponse.success("Student updated successfully", updated, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(400)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete Student Record", description = "Deletes student and cascaded login/attendance records.")
    public ResponseEntity<ApiResponse<Void>> deleteStudent(@PathVariable("id") String id) {
        String correlationId = UUID.randomUUID().toString();
        try {
            studentService.deleteStudent(id);
            return ResponseEntity.ok(ApiResponse.success("Student deleted successfully", null, correlationId));
        } catch (Exception e) {
            return ResponseEntity.status(404)
                    .body(ApiResponse.error(e.getMessage(), "STU_001", correlationId));
        }
    }
}
