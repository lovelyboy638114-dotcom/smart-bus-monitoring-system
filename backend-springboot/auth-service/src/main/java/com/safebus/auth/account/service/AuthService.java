package com.safebus.auth.account.service;

import com.safebus.auth.account.entity.Account;
import com.safebus.auth.account.entity.CredentialAudit;
import com.safebus.auth.account.repository.AccountRepository;
import com.safebus.auth.account.repository.CredentialAuditRepository;
import com.safebus.auth.security.service.JwtService;
import com.safebus.auth.account.dto.LoginRequest;
import com.safebus.auth.account.dto.LoginResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class AuthService {

    private final AccountRepository accountRepository;
    private final CredentialAuditRepository auditRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AccountRepository accountRepository,
                       CredentialAuditRepository auditRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.accountRepository = accountRepository;
        this.auditRepository = auditRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public LoginResponse login(LoginRequest request, String ip, String browser, String device) {
        Account account = accountRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        // Check Lock status
        if ("LOCKED".equals(account.getAccountStatus())) {
            if (account.getLockTime() != null && account.getLockTime().plusMinutes(15).isBefore(LocalDateTime.now())) {
                account.setAccountStatus("ACTIVE");
                account.setFailedLoginAttempts(0);
                account.setLockTime(null);
                accountRepository.save(account);
            } else {
                throw new RuntimeException("Account is locked due to multiple failed login attempts. Try again in 15 minutes.");
            }
        }

        // Validate Password
        if (!passwordEncoder.matches(request.getPassword(), account.getPassword())) {
            account.setFailedLoginAttempts(account.getFailedLoginAttempts() + 1);
            if (account.getFailedLoginAttempts() >= 5) {
                account.setAccountStatus("LOCKED");
                account.setLockTime(LocalDateTime.now());
            }
            accountRepository.save(account);
            throw new RuntimeException("Invalid username or password");
        }

        // Successful Login
        account.setFailedLoginAttempts(0);
        account.setLastLogin(LocalDateTime.now());
        accountRepository.save(account);

        // Audit Logging
        CredentialAudit audit = CredentialAudit.builder()
                .accountId(account.getId())
                .generatedBy(account.getUsername())
                .credentialType("LOGIN")
                .firstLoginCompleted(!account.isMustChangePassword())
                .status("ACTIVE")
                .ipAddress(ip)
                .browser(browser)
                .device(device)
                .build();
        auditRepository.save(audit);

        // Access and Refresh Tokens
        String token = jwtService.generateToken(
            account.getUsername(),
            account.getRole(),
            account.getFullName(),
            account.isMustChangePassword()
        );
        String refreshToken = jwtService.generateRefreshToken(account.getUsername());

        return LoginResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .role(account.getRole())
                .username(account.getUsername())
                .fullName(account.getFullName())
                .mustChangePassword(account.isMustChangePassword())
                .build();
    }

    @Transactional
    public void changePassword(String username, String currentPassword, String newPassword, String ip, String browser, String device) {
        Account account = accountRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Account not found"));

        if (!passwordEncoder.matches(currentPassword, account.getPassword())) {
            throw new RuntimeException("Invalid current password");
        }

        account.setPassword(passwordEncoder.encode(newPassword));
        account.setMustChangePassword(false);
        account.setLastPasswordChange(LocalDateTime.now());
        accountRepository.save(account);

        CredentialAudit audit = CredentialAudit.builder()
                .accountId(account.getId())
                .generatedBy(account.getUsername())
                .credentialType("PASSWORD_CHANGE")
                .firstLoginCompleted(true)
                .status("ACTIVE")
                .ipAddress(ip)
                .browser(browser)
                .device(device)
                .build();
        auditRepository.save(audit);
    }
}
