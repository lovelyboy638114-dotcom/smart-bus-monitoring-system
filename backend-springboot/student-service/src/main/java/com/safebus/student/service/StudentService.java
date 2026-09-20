package com.safebus.student.service;

import com.safebus.student.entity.Parent;
import com.safebus.student.entity.Student;
import com.safebus.student.repository.ParentRepository;
import com.safebus.student.repository.StudentRepository;
import com.safebus.student.repository.AccountRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import com.safebus.student.dto.StudentRegistrationRequest;
import com.safebus.student.exception.ParentNotFoundException;
import org.springframework.security.access.AccessDeniedException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class StudentService {
    private static final Logger log = LoggerFactory.getLogger(StudentService.class);

    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final AccountRepository accountRepository;
    private final RestTemplate restTemplate;
    private final IDCardService idCardService;

    @PersistenceContext
    private EntityManager entityManager;

    public StudentService(StudentRepository studentRepository, ParentRepository parentRepository, AccountRepository accountRepository, RestTemplate restTemplate, IDCardService idCardService) {
        this.studentRepository = studentRepository;
        this.parentRepository = parentRepository;
        this.accountRepository = accountRepository;
        this.restTemplate = restTemplate;
        this.idCardService = idCardService;
    }

    public Parent resolveParent(String username) {
        log.info("[ParentResolver] Authenticated Username: {}", username);
        log.info("[ParentResolver] JWT Subject: {}", username);

        long startTime = System.currentTimeMillis();
        Parent parent = parentRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.warn("[ParentResolver] Parent record not found in database for username: {}", username);
                    return new ParentNotFoundException("Parent not found for username: " + username);
                });
        long duration = System.currentTimeMillis() - startTime;

        log.info("[ParentResolver] Resolved Parent ID: {}", parent.getId());
        log.info("[ParentResolver] Resolved Parent Username: {}", parent.getUsername());
        log.info("[ParentResolver] Execution Time: {} ms", duration);

        return parent;
    }

    public List<Student> getChildrenByParent(String username) {
        Parent parent = resolveParent(username);
        List<Student> children = studentRepository.findByParentId(parent.getId());
        log.info("[ParentResolver] Linked Students Count: {}", children.size());
        log.info("[ParentResolver] Student IDs Returned: {}", 
                 children.stream().map(Student::getId).toList());
        return children;
    }

    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    public Optional<Student> getStudentById(String id) {
        return studentRepository.findById(id);
    }

    public Student getStudentBySchoolEmail(String email) {
        return studentRepository.findBySchoolEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Student not found for email: " + email));
    }

    @org.springframework.transaction.annotation.Transactional
    public Student regenerateIdCard(String studentId) {
        try {
            idCardService.generateIDCard(studentId, java.util.UUID.randomUUID().toString());
            return studentRepository.findById(studentId)
                    .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        } catch (Exception e) {
            throw new RuntimeException("ID Card regeneration failed: " + e.getMessage(), e);
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public Student autoAssignBus(String studentId) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found: " + studentId);
        }
        Student student = studentOpt.get();
        String address = student.getAddress();
        if (address == null) {
            address = "";
        }
        address = address.toLowerCase();

        String busId = "TN38AB1234"; // Default Bus 1
        String routeId = "Route A";

        if (address.contains("hope") || address.contains("peelamedu") || address.contains("singanallur") 
            || address.contains("chinniyampalayam") || address.contains("neelambur") || address.contains("kalapatti") 
            || address.contains("saravanampatti")) {
            busId = "TN38CD5678"; // Bus 2
            routeId = "Route B";
        } else if (address.contains("ukkadam") || address.contains("town") || address.contains("podanur") 
            || address.contains("sundarapuram") || address.contains("kuniyamuthur") || address.contains("eachanari") 
            || address.contains("madukkarai")) {
            busId = "TN38EP9012"; // Bus 3
            routeId = "Route C";
        } else if (address.contains("gandhipuram") || address.contains("puram") || address.contains("colony") 
            || address.contains("vadavalli") || address.contains("thudiyalur") || address.contains("kavundampalayam") 
            || address.contains("mills")) {
            busId = "TN38AB1234"; // Bus 1
            routeId = "Route A";
        }

        student.setBusId(busId);
        student.setRouteId(routeId);
        student.setStatus("ASSIGNED");
        studentRepository.save(student);

        try {
            return regenerateIdCard(studentId);
        } catch (Exception e) {
            log.error("[StudentService] Automated ID Card generation failed on autoAssignBus: {}", e.getMessage());
            return student;
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public Student updateStudentBusAssignment(String studentId, String busId, String status) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found: " + studentId);
        }
        Student student = studentOpt.get();
        student.setBusId(busId);
        student.setStatus(status);
        studentRepository.save(student);

        try {
            return regenerateIdCard(studentId);
        } catch (Exception e) {
            log.error("[StudentService] Automated ID Card generation failed on updateStudentBusAssignment: {}", e.getMessage());
            return student;
        }
    }

    public long getAssignedCount(String busId) {
        return studentRepository.countByBusId(busId);
    }

    public Student saveStudent(Student student) {
        return studentRepository.save(student);
    }

    public void authorizeIdCardAccess(String studentId, String username, String role) {
        if ("ROLE_ADMIN".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role) || "ROLE_SUPER_ADMIN".equalsIgnoreCase(role) || "SUPER_ADMIN".equalsIgnoreCase(role)) {
            return;
        }
        if ("ROLE_STUDENT".equalsIgnoreCase(role) || "STUDENT".equalsIgnoreCase(role)) {
            Optional<Student> studentOpt = studentRepository.findById(studentId);
            if (studentOpt.isEmpty() || !username.equalsIgnoreCase(studentOpt.get().getSchoolEmail())) {
                throw new AccessDeniedException("Access denied: Students can only view their own ID card.");
            }
            return;
        }
        if ("ROLE_PARENT".equalsIgnoreCase(role) || "PARENT".equalsIgnoreCase(role)) {
            Parent parent = parentRepository.findByUsername(username)
                    .orElseThrow(() -> new ParentNotFoundException("Parent not found: " + username));
            List<Student> children = studentRepository.findByParentId(parent.getId());
            boolean isChild = children.stream().anyMatch(s -> s.getId().equalsIgnoreCase(studentId));
            if (!isChild) {
                throw new AccessDeniedException("Access denied: Parents can only view their linked children's ID cards.");
            }
            return;
        }
        throw new AccessDeniedException("Access denied: Unauthorized role.");
    }

    @org.springframework.transaction.annotation.Transactional
    public Student updateStudentProfile(String studentId, String bloodGroup, String address, String medicalNotes) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));
        student.setBloodGroup(bloodGroup);
        student.setAddress(address);
        student.setMedicalNotes(medicalNotes);
        return studentRepository.save(student);
    }

    @org.springframework.transaction.annotation.Transactional
    public void deleteStudent(String studentId) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new IllegalArgumentException("Student not found: " + studentId);
        }
        Student student = studentOpt.get();

        // 1. Delete associated student account from accounts table
        if (student.getSchoolEmail() != null) {
            accountRepository.deleteByUsername(student.getSchoolEmail());
        }

        // 2. Cascade delete logs/history referencing this student using raw SQL to prevent FK constraints issues
        entityManager.createNativeQuery("DELETE FROM attendance_logs WHERE student_id = ?1").setParameter(1, studentId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM id_card_download_history WHERE student_id = ?1").setParameter(1, studentId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM parent_notification_logs WHERE student_id = ?1").setParameter(1, studentId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM student_events WHERE student_id = ?1").setParameter(1, studentId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM trip_timeline_events WHERE student_id = ?1").setParameter(1, studentId).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM driver_messages WHERE studentId = ?1").setParameter(1, studentId).executeUpdate();

        // 3. Delete student record
        studentRepository.delete(student);
        log.info("[StudentService] Cascaded delete student profile and database associations for: {}", studentId);
    }

    @org.springframework.transaction.annotation.Transactional
    public Student updateStudent(String studentId, StudentRegistrationRequest request) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

        student.setName(request.getName());
        student.setRollNo(request.getRollNo());
        student.setClassName(request.getClassName());
        student.setSection(request.getSection());
        student.setGender(request.getGender());
        student.setDob(request.getDob());
        student.setBloodGroup(request.getBloodGroup());
        student.setAddress(request.getAddress());
        student.setMedicalNotes(request.getMedicalNotes());
        student.setParentName(request.getParentName());
        student.setParentPhone(request.getParentPhone());

        // Update assigned bus if changed
        if (request.getBusId() != null && !request.getBusId().equalsIgnoreCase(student.getBusId())) {
            student.setBusId(request.getBusId());
            // Automatically regenerate card if bus assignment changed
            try {
                idCardService.generateIDCard(studentId, java.util.UUID.randomUUID().toString());
            } catch (Exception e) {
                log.error("Failed to regenerate card on update: " + e.getMessage());
            }
        }
        
        return studentRepository.save(student);
    }

    @org.springframework.transaction.annotation.Transactional
    public Student updateBoardingStatus(String studentId, String boardingType, String scanTime) {
        Student student = studentRepository.findById(studentId)
                .or(() -> studentRepository.findByRollNo(studentId))
                .orElseThrow(() -> new IllegalArgumentException("Student not found: " + studentId));

        if ("boarded".equalsIgnoreCase(boardingType) || "Boarded".equalsIgnoreCase(boardingType)) {
            student.setBoarded(1);
            student.setBoardedTime(scanTime != null ? scanTime : java.time.LocalTime.now().toString());
            student.setStudentStatus("On Board");
            student.setStatus("Present");
        } else if ("arrived".equalsIgnoreCase(boardingType) || "reachedSchool".equalsIgnoreCase(boardingType) || "ReachedSchool".equalsIgnoreCase(boardingType)) {
            student.setReachedSchool(1);
            student.setStudentStatus("Dropped");
            student.setStatus("Present");
        } else if ("boardedReturn".equalsIgnoreCase(boardingType) || "BoardedReturn".equalsIgnoreCase(boardingType)) {
            student.setBoardedReturn(1);
            student.setStudentStatus("Returning");
            student.setStatus("Present");
        } else if ("reachedHome".equalsIgnoreCase(boardingType) || "ReachedHome".equalsIgnoreCase(boardingType)) {
            student.setReachedHome(1);
            student.setStudentStatus("Reached Home");
            student.setStatus("Present");
        }

        return studentRepository.save(student);
    }
}
