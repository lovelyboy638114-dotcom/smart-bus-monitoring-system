package com.safebus.auth.security.config;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.bouncycastle.crypto.generators.SCrypt;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class CustomPasswordEncoder implements PasswordEncoder {

    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        // Enforce standard BCrypt for newly created/changed passwords
        return bcrypt.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null) {
            return false;
        }

        // If the password starts with "scrypt:", verify using Bouncy Castle scrypt
        if (encodedPassword.startsWith("scrypt:")) {
            return verifyWerkzeugScrypt(rawPassword.toString(), encodedPassword);
        }

        // Fallback to standard BCrypt comparison
        return bcrypt.matches(rawPassword, encodedPassword);
    }

    private boolean verifyWerkzeugScrypt(String rawPassword, String encodedPassword) {
        try {
            // Format is: scrypt:32768:8:1$salt$hash
            String[] parts = encodedPassword.split("\\$");
            if (parts.length != 3) {
                return false;
            }

            String paramsPart = parts[0]; // scrypt:32768:8:1
            String saltStr = parts[1];    // salt
            String hashStr = parts[2];    // hash

            String[] params = paramsPart.split(":");
            if (params.length != 4 || !params[0].equals("scrypt")) {
                return false;
            }

            int n = Integer.parseInt(params[1]); // 32768
            int r = Integer.parseInt(params[2]); // 8
            int p = Integer.parseInt(params[3]); // 1

            byte[] salt = saltStr.getBytes(StandardCharsets.UTF_8);
            byte[] hashBytes = hexStringToByteArray(hashStr);
            int dkLen = hashBytes.length;

            byte[] derivedBytes = SCrypt.generate(
                rawPassword.getBytes(StandardCharsets.UTF_8),
                salt,
                n,
                r,
                p,
                dkLen
            );

            return MessageDigest.isEqual(hashBytes, derivedBytes);
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                                 + Character.digit(s.charAt(i+1), 16));
        }
        return data;
    }
}
