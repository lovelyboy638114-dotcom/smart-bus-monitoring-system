package com.safebus.student.service;

import com.safebus.student.entity.Parent;
import com.safebus.student.entity.Student;
import com.safebus.student.repository.ParentRepository;
import com.safebus.student.repository.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Service
public class StudentService {
    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final RestTemplate restTemplate;
    private final IDCardService idCardService;

    public StudentService(StudentRepository studentRepository, ParentRepository parentRepository, RestTemplate restTemplate, IDCardService idCardService) {
        this.studentRepository = studentRepository;
        this.parentRepository = parentRepository;
        this.restTemplate = restTemplate;
        this.idCardService = idCardService;
    }

    public Parent resolveParent(String username) {
        // Try exact match first
        Optional<Parent> pOpt = parentRepository.findByUsername(username);
        if (pOpt.isPresent()) {
            return pOpt.get();
        }

        // Apply fuzzy logic mapping (e.g., sureshr003.parent@happyjourney.ai -> sureshsharmar002.parent@happyjourney.ai)
        String prefix = username.split("@")[0].replaceAll("\\d+$", ""); // strip trailing numbers
        if (prefix.endsWith("r")) {
            prefix = prefix.substring(0, prefix.length() - 1);
        }

        List<Parent> allParents = parentRepository.findAll();
        for (Parent p : allParents) {
            String pPrefix = p.getUsername().split("@")[0].replaceAll("\\d+$", "");
            if (pPrefix.endsWith("r")) {
                pPrefix = pPrefix.substring(0, pPrefix.length() - 1);
            }
            if (pPrefix.equals(prefix) || pPrefix.startsWith(prefix) || prefix.startsWith(pPrefix)) {
                return p;
            }
        }
        throw new RuntimeException("Parent profile not found for username: " + username);
    }

    public List<Student> getChildrenByParent(String username) {
        Parent parent = resolveParent(username);
        return studentRepository.findByParentId(parent.getId());
    }

    public Optional<Student> getStudentById(String id) {
        return studentRepository.findById(id);
    }

    @org.springframework.transaction.annotation.Transactional
    public Student regenerateIdCard(String studentId) {
        Optional<Student> studentOpt = studentRepository.findById(studentId);
        if (studentOpt.isEmpty()) {
            throw new RuntimeException("Student not found: " + studentId);
        }

        Student student = studentOpt.get();

        // Prepare payload for ID Card generation
        Map<String, Object> payload = new HashMap<>();
        payload.put("id", student.getId());
        payload.put("name", student.getName());
        payload.put("rollNo", student.getRollNo());
        payload.put("className", student.getClassName());
        payload.put("section", student.getSection() != null ? student.getSection() : "A");
        payload.put("dob", student.getDob() != null ? student.getDob() : "N/A");
        payload.put("gender", student.getGender() != null ? student.getGender() : "N/A");
        payload.put("bloodGroup", student.getBloodGroup() != null ? student.getBloodGroup() : "N/A");
        payload.put("parentName", student.getParentName() != null ? student.getParentName() : "N/A");
        payload.put("parentPhone", student.getParentPhone() != null ? student.getParentPhone() : "N/A");

        // Make direct local call to IDCardService
        try {
            Map<String, String> paths = idCardService.generateIDCard(payload);
            if (paths != null && !paths.containsKey("error")) {
                student.setIdCardFrontPath(paths.get("front_path"));
                student.setIdCardBackPath(paths.get("back_path"));
                student.setIdCardPdfPath(paths.get("pdf_path"));
                student.setIdCardGeneratedAt(LocalDateTime.now());
                student.setIdCardStatus("ACTIVE");
                student.setIdCardVersion(student.getIdCardVersion() != null ? student.getIdCardVersion() + 1 : 1);

                return studentRepository.save(student);
            } else {
                String error = paths != null ? paths.get("error") : "Unknown Error";
                throw new RuntimeException("IDCardService failed: " + error);
            }
        } catch (Exception e) {
            throw new RuntimeException("ID Card regeneration failed: " + e.getMessage(), e);
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
        return studentRepository.save(student);
    }

    public long getAssignedCount(String busId) {
        return studentRepository.countByBusId(busId);
    }
}
