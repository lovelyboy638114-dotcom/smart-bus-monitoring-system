package com.safebus.transport.driver;

import com.safebus.common.dto.response.ApiResponse;
import com.safebus.transport.entity.Bus;
import com.safebus.transport.repository.BusRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/drivers")
@Tag(name = "Drivers", description = "Driver profiles querying and roster metadata details APIs")
public class DriverController {
    private final BusRepository busRepository;

    public DriverController(BusRepository busRepository) {
        this.busRepository = busRepository;
    }

    @GetMapping
    @Operation(summary = "Get All Drivers", description = "Query driver names, credentials experience, license keys, and assigned vehicle metrics logs.")
    @ApiResponses({
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Drivers retrieved successfully")
    })
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllDrivers() {
        List<Bus> buses = busRepository.findAll();
        List<Map<String, Object>> drivers = new ArrayList<>();
        for (Bus b : buses) {
            if (b.getDriver() != null && !b.getDriver().isEmpty()) {
                Map<String, Object> d = new HashMap<>();
                d.put("driverName", b.getDriver());
                d.put("driverLicense", b.getDriverLicense());
                d.put("driverExperience", b.getDriverExperience());
                d.put("busId", b.getId());
                drivers.add(d);
            }
        }
        ApiResponse<List<Map<String, Object>>> res = ApiResponse.<List<Map<String, Object>>>builder()
                .success(true)
                .message("Drivers retrieved successfully")
                .data(drivers)
                .build();
        return ResponseEntity.ok(res);
    }
}
