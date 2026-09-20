package com.safebus.student.service;

import com.safebus.student.dto.*;
import com.safebus.student.entity.*;
import com.safebus.student.exception.*;
import com.safebus.student.repository.*;
import com.safebus.student.event.StudentRegistrationEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

@Service
public class AdminRegistrationService {

    private static final Logger log = LoggerFactory.getLogger(AdminRegistrationService.class);

    private final StudentRepository studentRepository;
    private final ParentRepository parentRepository;
    private final AccountRepository accountRepository;
    private final CredentialAuditRepository auditRepository;
    private final PasswordGeneratorService passwordGenerator;
    private final UsernameGeneratorService usernameGenerator;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher eventPublisher;
    private final RestClient restClient;

    public AdminRegistrationService(StudentRepository studentRepository,
                                    ParentRepository parentRepository,
                                    AccountRepository accountRepository,
                                    CredentialAuditRepository auditRepository,
                                    PasswordGeneratorService passwordGenerator,
                                    UsernameGeneratorService usernameGenerator,
                                    PasswordEncoder passwordEncoder,
                                    ApplicationEventPublisher eventPublisher,
                                    RestClient.Builder restClientBuilder) {
        this.studentRepository = studentRepository;
        this.parentRepository = parentRepository;
        this.accountRepository = accountRepository;
        this.auditRepository = auditRepository;
        this.passwordGenerator = passwordGenerator;
        this.usernameGenerator = usernameGenerator;
        this.passwordEncoder = passwordEncoder;
        this.eventPublisher = eventPublisher;
        this.restClient = restClientBuilder.build();
    }

    @Transactional
    public StudentRegistrationResponse registerStudent(StudentRegistrationRequest request) {
        log.info("[AdminService] Processing registration request for Student: {}", request.getName());

        // Idempotency: Duplicate admission number / roll number check
        if (studentRepository.findByAdmissionNo(request.getRollNo()).isPresent()) {
            throw new DuplicateStudentException("Student with roll number/admission number " + request.getRollNo() + " already exists.");
        }

        String studentId = "STU_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 1. Resolve or Create Parent
        Parent parent = null;
        boolean parentReused = false;
        String parentTempPass = "";
        String parentUsername = "";

        Optional<Parent> existingParent = parentRepository.findByPhone(request.getParentPhone());
        if (existingParent.isEmpty() && request.getParentEmail() != null && !request.getParentEmail().isEmpty()) {
            existingParent = parentRepository.findByEmail(request.getParentEmail());
        }

        if (existingParent.isPresent()) {
            parent = existingParent.get();
            parentReused = true;
            parentUsername = parent.getUsername();
            log.info("[AdminService] Reusing existing Parent profile with ID: {}", parent.getId());
        } else {
            // Save parent first with temporary values to acquire database auto-increment ID
            parent = Parent.builder()
                    .fatherName(request.getParentName())
                    .motherName("Mother")
                    .phone(request.getParentPhone())
                    .email(request.getParentEmail() != null ? request.getParentEmail() : "parent@happyjourney.ai")
                    .address(request.getAddress() != null ? request.getAddress() : "Not Specified")
                    .username("PENDING_" + studentId)
                    .passwordHash("PENDING_HASH")
                    .build();

            parent = parentRepository.saveAndFlush(parent);

            // Generate parent usernames and secure credentials thread-safely via database ID sequence
            parentUsername = usernameGenerator.generateParentUsername(request.getParentName(), studentId);
            parentTempPass = passwordGenerator.generateSecurePassword();
            String parentPassHash = passwordEncoder.encode(parentTempPass);

            parent.setUsername(parentUsername);
            parent.setPasswordHash(parentPassHash);
            parentRepository.save(parent);

            // Provision matching Parent Account in security accounts table
            Account parentAccount = Account.builder()
                    .role("parent")
                    .username(parentUsername)
                    .password(parentPassHash)
                    .fullName(request.getParentName())
                    .phone(request.getParentPhone())
                    .mustChangePassword(true)
                    .accountStatus("ACTIVE")
                    .build();
            accountRepository.save(parentAccount);

            // Log security audit for parent account creation
            CredentialAudit parentAudit = CredentialAudit.builder()
                    .accountId(parentAccount.getId())
                    .generatedBy("admin")
                    .credentialType("CREATION")
                    .status("ACTIVE")
                    .build();
            auditRepository.save(parentAudit);
            log.info("[AdminService] Created new Parent profile & login account ID: {}", parent.getId());
        }

        // 2. Student Creation
        String studentUsername = usernameGenerator.generateStudentUsername(request.getName(), studentId);
        String studentTempPass = passwordGenerator.generateSecurePassword();
        String studentPassHash = passwordEncoder.encode(studentTempPass);

        Student student = Student.builder()
                .id(studentId)
                .name(request.getName())
                .rollNo(request.getRollNo())
                .className(request.getClassName())
                .section(request.getSection())
                .gender(request.getGender())
                .dob(request.getDob())
                .bloodGroup(request.getBloodGroup())
                .address(request.getAddress())
                .medicalNotes(request.getMedicalNotes())
                .parentName(request.getParentName())
                .parentPhone(request.getParentPhone())
                .parentId(parent.getId())
                .schoolEmail(studentUsername)
                .studentStatus("ACTIVE")
                .status("BUS_PENDING")
                .idCardVersion(1)
                .idCardStatus(IdCardStatus.PENDING)
                .build();

        student = studentRepository.save(student);

        // Provision matching Student Account in security accounts table
        Account studentAccount = Account.builder()
                .role("student")
                .username(studentUsername)
                .password(studentPassHash)
                .fullName(request.getName())
                .phone(request.getParentPhone())
                .mustChangePassword(true)
                .accountStatus("ACTIVE")
                .build();
        accountRepository.save(studentAccount);

        // Log security audit for student account creation
        CredentialAudit studentAudit = CredentialAudit.builder()
                .accountId(studentAccount.getId())
                .generatedBy("admin")
                .credentialType("CREATION")
                .status("ACTIVE")
                .build();
        auditRepository.save(studentAudit);

        // 3. Routing Assignment
        boolean busAssigned = false;
        if (request.getBusId() != null && !request.getBusId().isEmpty()) {
            student.setBusId(request.getBusId());
            student.setRouteId("Route A"); // Default route mapping fallback
            student.setStatus("Waiting");
            student.setAssignmentStatus("MANUAL");
            student.setAssignedAt(LocalDateTime.now());
            studentRepository.save(student);
            busAssigned = true;
            log.info("[AdminService] Manually assigned Student {} to Bus route: {}", studentId, request.getBusId());
        } else {
            // Asynchronous / REST based routing classification on TRANSPORT-SERVICE
            try {
                log.info("[AdminService] Requesting auto-assignment from TRANSPORT-SERVICE for Student ID: {}", studentId);
                restClient.post()
                        .uri("http://TRANSPORT-SERVICE/api/v1/assignments/auto-assign/" + studentId)
                        .retrieve()
                        .toBodilessEntity();
                busAssigned = true;
            } catch (Exception e) {
                log.warn("[AdminService] TRANSPORT-SERVICE auto-assignment call failed. Reserving student status as BUS_PENDING. Error: {}", e.getMessage());
                student.setStatus("BUS_PENDING");
                student.setAssignmentStatus("BUS_PENDING");
                studentRepository.save(student);
            }
        }

        // 4. Publish Spring application event to trigger AFTER_COMMIT RabbitMQ event dispatch
        eventPublisher.publishEvent(new StudentRegistrationEvent(this, student));

        return StudentRegistrationResponse.builder()
                .studentId(studentId)
                .username(studentUsername)
                .temporaryPassword(studentTempPass)
                .mustChangePassword(true)
                .busAssigned(busAssigned)
                .parentLinked(parentReused)
                .studentEmail(studentUsername)
                .studentTempPass(studentTempPass)
                .parentEmail(parentUsername)
                .parentTempPass(parentTempPass)
                .parentReused(parentReused)
                .build();
    }

    @Transactional
    public DriverRegistrationResponse registerDriver(DriverRegistrationRequest request) {
        log.info("[AdminService] Processing driver registration request: {}", request.getName());

        // Check duplicate driver ID in accounts
        Optional<Account> existingDriver = accountRepository.findByUsername(request.getDriverId());
        if (existingDriver.isPresent()) {
            throw new IllegalArgumentException("Driver account with ID/username " + request.getDriverId() + " already exists.");
        }

        // Auto-acquire sequence ID from Account DB saves
        Account tempAccount = Account.builder()
                .role("driver")
                .username("PENDING_" + UUID.randomUUID())
                .password("PENDING_HASH")
                .fullName(request.getName())
                .phone(request.getPhone())
                .mustChangePassword(true)
                .accountStatus("ACTIVE")
                .build();
        tempAccount = accountRepository.saveAndFlush(tempAccount);

        String driverEmail = usernameGenerator.generateDriverUsername(tempAccount.getId());
        String driverTempPass = passwordGenerator.generateSecurePassword();
        String driverPassHash = passwordEncoder.encode(driverTempPass);

        tempAccount.setUsername(driverEmail);
        tempAccount.setPassword(driverPassHash);
        tempAccount.setLicenseNo(request.getLicenseNo());
        tempAccount.setExperienceYears(request.getExperienceYears());
        tempAccount.setBusRoute(request.getBusRoute());
        accountRepository.save(tempAccount);

        // Audit Logging
        CredentialAudit audit = CredentialAudit.builder()
                .accountId(tempAccount.getId())
                .generatedBy("admin")
                .credentialType("CREATION")
                .status("ACTIVE")
                .build();
        auditRepository.save(audit);

        log.info("[AdminService] Successfully provisioned Driver account: {}", driverEmail);
        return DriverRegistrationResponse.builder()
                .driverEmail(driverEmail)
                .driverTempPassword(driverTempPass)
                .build();
    }

    @Transactional
    public ParentRegistrationResponse registerParent(ParentRegistrationRequest request) {
        log.info("[AdminService] Processing standalone Parent registration: {}", request.getParentName());

        Optional<Parent> existingParent = parentRepository.findByPhone(request.getPhone());
        if (existingParent.isPresent()) {
            return ParentRegistrationResponse.builder()
                    .parentEmail(existingParent.get().getUsername())
                    .parentTempPassword("[Reused Account]")
                    .parentReused(true)
                    .build();
        }

        Parent parent = Parent.builder()
                .fatherName(request.getParentName())
                .motherName("Mother")
                .phone(request.getPhone())
                .email(request.getEmail() != null ? request.getEmail() : "parent@happyjourney.ai")
                .address(request.getAddress() != null ? request.getAddress() : "Not Specified")
                .username("PENDING_" + UUID.randomUUID())
                .passwordHash("PENDING_HASH")
                .build();

        parent = parentRepository.saveAndFlush(parent);

        String parentUsername = usernameGenerator.generateParentUsername(parent.getId());
        String parentTempPass = passwordGenerator.generateSecurePassword();
        String parentPassHash = passwordEncoder.encode(parentTempPass);

        parent.setUsername(parentUsername);
        parent.setPasswordHash(parentPassHash);
        parentRepository.save(parent);

        // Account mapping
        Account parentAccount = Account.builder()
                .role("parent")
                .username(parentUsername)
                .password(parentPassHash)
                .fullName(request.getParentName())
                .phone(request.getPhone())
                .mustChangePassword(true)
                .accountStatus("ACTIVE")
                .build();
        accountRepository.save(parentAccount);

        CredentialAudit audit = CredentialAudit.builder()
                .accountId(parentAccount.getId())
                .generatedBy("admin")
                .credentialType("CREATION")
                .status("ACTIVE")
                .build();
        auditRepository.save(audit);

        // Link student if ID provided
        if (request.getStudentId() != null && !request.getStudentId().isEmpty()) {
            Optional<Student> studentOpt = studentRepository.findById(request.getStudentId());
            if (studentOpt.isPresent()) {
                Student student = studentOpt.get();
                student.setParentId(parent.getId());
                student.setParentName(request.getParentName());
                student.setParentPhone(request.getPhone());
                studentRepository.save(student);
                log.info("[AdminService] Linked Parent ID {} to Student ID {}", parent.getId(), student.getId());
            }
        }

        return ParentRegistrationResponse.builder()
                .parentEmail(parentUsername)
                .parentTempPassword(parentTempPass)
                .parentReused(false)
                .build();
    }

    @Transactional
    public PasswordResetResponse resetPassword(String username) {
        log.info("[AdminService] Processing password reset request for Username: {}", username);

        Optional<Account> accountOpt = accountRepository.findByUsername(username);
        if (accountOpt.isEmpty()) {
            throw new NoSuchElementException("Account not found with username: " + username);
        }

        Account account = accountOpt.get();
        String tempPass = passwordGenerator.generateSecurePassword();
        String passHash = passwordEncoder.encode(tempPass);

        account.setPassword(passHash);
        account.setMustChangePassword(true);
        account.setLastPasswordChange(null);
        accountRepository.save(account);

        // Update corresponding tables depending on role
        if ("parent".equals(account.getRole())) {
            Optional<Parent> parentOpt = parentRepository.findByUsername(username);
            if (parentOpt.isPresent()) {
                Parent parent = parentOpt.get();
                parent.setPasswordHash(passHash);
                parentRepository.save(parent);
            }
        }

        CredentialAudit audit = CredentialAudit.builder()
                .accountId(account.getId())
                .generatedBy("admin")
                .credentialType("RESET")
                .status("ACTIVE")
                .build();
        auditRepository.save(audit);

        return PasswordResetResponse.builder()
                .username(username)
                .temporaryPassword(tempPass)
                .mustChangePassword(true)
                .build();
    }
}
