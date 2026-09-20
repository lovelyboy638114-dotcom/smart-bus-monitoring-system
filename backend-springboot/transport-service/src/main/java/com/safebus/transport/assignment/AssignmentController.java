package com.safebus.transport.assignment;
import com.safebus.common.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/assignments")
@Tag(name = "Assignments", description = "Bus assignments and routing calculator helper APIs")
public class AssignmentController {
    private final BusAssignmentService busAssignmentService;

    public AssignmentController(BusAssignmentService busAssignmentService) {
        this.busAssignmentService = busAssignmentService;
    }

    @PostMapping("/auto-assign/{studentId}")
    @Operation(summary = "Auto Assign Bus to Student", description = "Resolves closest coordinates and assigns student to the best fitting route option.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Assignment checked successfully")
    })
    public ResponseEntity<ApiResponse<Boolean>> autoAssignBus(
            @Parameter(description = "Unique student UUID", example = "STU001") @PathVariable String studentId) {
        String correlationId = UUID.randomUUID().toString();
        try {
            boolean success = busAssignmentService.assignBusToStudent(studentId);
            if (success) {
                return ResponseEntity.ok(ApiResponse.success("Bus successfully assigned", true, correlationId));
            } else {
                return ResponseEntity.ok(ApiResponse.success("Bus assignment is pending manual review", false, correlationId));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error(e.getMessage(), "BUS_002", correlationId));
        }
    }
}
