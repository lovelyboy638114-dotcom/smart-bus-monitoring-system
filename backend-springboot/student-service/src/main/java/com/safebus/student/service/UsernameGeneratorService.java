package com.safebus.student.service;

import org.springframework.stereotype.Service;
import java.time.Year;

@Service
public class UsernameGeneratorService {

    public String generateStudentUsername(String name, String studentId) {
        String cleanName = name.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        String cleanId = studentId.trim().toLowerCase();
        return String.format("%s_%s.student@happyjourney.ai", cleanName, cleanId);
    }

    public String generateParentUsername(String parentName, String studentId) {
        String cleanName = parentName.trim().toLowerCase().replaceAll("[^a-z0-9]", "");
        String cleanId = studentId.trim().toLowerCase();
        return String.format("%s_%s.parent@happyjourney.ai", cleanName, cleanId);
    }

    public String generateParentUsername(Integer parentId) {
        return String.format("%dPAR%04d.parent@happyjourney.ai", Year.now().getValue(), parentId);
    }

    public String generateDriverUsername(Integer accountId) {
        return String.format("%dDRV%04d.driver@happyjourney.ai", Year.now().getValue(), accountId);
    }
}
