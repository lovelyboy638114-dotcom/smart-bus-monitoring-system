package com.safebus.student.service;

import com.safebus.student.entity.Student;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

@Component
public class FrontCardRenderer {

    private static final int CARD_WIDTH = 640;
    private static final int CARD_HEIGHT = 400;

    public BufferedImage renderFront(Student student, String storageLocation) throws IOException {
        BufferedImage img = new BufferedImage(CARD_WIDTH, CARD_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();

        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Background
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        // Header Blue Banner
        g.setColor(new Color(30, 41, 59)); // Slate 800
        g.fillRect(0, 0, CARD_WIDTH, 80);

        // Header text (School Branding)
        g.setColor(Color.WHITE);
        g.setFont(new Font("Arial", Font.BOLD, 22));
        g.drawString("HappyJourney Academy", 120, 35);

        g.setColor(new Color(200, 220, 255));
        g.setFont(new Font("Arial", Font.PLAIN, 12));
        g.drawString("Safe Journeys, Smart Minds", 120, 58);

        // Logo Circle Placeholder
        g.setColor(new Color(255, 255, 255, 60));
        g.fillOval(30, 10, 60, 60);
        g.setColor(Color.WHITE);
        g.setFont(new Font("Arial", Font.BOLD, 16));
        g.drawString("HJA", 45, 47);

        // Photo Rectangle Placeholder
        g.setColor(new Color(240, 240, 240));
        g.fillRect(35, 110, 140, 165);
        g.setColor(new Color(200, 200, 200));
        g.drawRect(35, 110, 140, 165);

        boolean photoDrawn = false;
        if (student.getPhoto() != null && !student.getPhoto().isEmpty()) {
            try {
                String relativePhotoPath = student.getPhoto();
                if (relativePhotoPath.contains("/uploads/")) {
                    relativePhotoPath = relativePhotoPath.substring(relativePhotoPath.indexOf("/uploads/") + 9);
                }
                File photoFile = new File(storageLocation, relativePhotoPath);
                if (photoFile.exists()) {
                    BufferedImage photoImg = ImageIO.read(photoFile);
                    g.drawImage(photoImg, 35, 110, 140, 165, null);
                    photoDrawn = true;
                }
            } catch (Exception e) {
                // fall back to silhouette
            }
        }

        if (!photoDrawn) {
            // Draw generic user silhouette avatar inside photo box
            g.setColor(new Color(180, 180, 180));
            g.fillOval(85, 140, 40, 40);
            g.fillArc(65, 185, 80, 80, 0, 180);
        }

        // Draw Student details
        g.setColor(new Color(15, 23, 42)); // Slate 900
        g.setFont(new Font("Arial", Font.BOLD, 20));
        g.drawString(student.getName() != null ? student.getName() : "Student Name", 200, 120);

        g.setFont(new Font("Arial", Font.PLAIN, 13));
        String[][] details = {
            {"Student ID:", student.getId() != null ? student.getId() : "N/A"},
            {"Admission No:", student.getAdmissionNo() != null ? student.getAdmissionNo() : "N/A"},
            {"Class & Sec:", (student.getClassName() != null ? student.getClassName() : "N/A") + " - " + (student.getSection() != null ? student.getSection() : "A")},
            {"DOB & Gender:", (student.getDob() != null ? student.getDob() : "N/A") + " | " + (student.getGender() != null ? student.getGender() : "N/A")},
            {"Blood Group:", student.getBloodGroup() != null ? student.getBloodGroup() : "N/A"},
            {"Parent Name:", student.getParentName() != null ? student.getParentName() : "N/A"},
            {"Parent Phone:", student.getParentPhone() != null ? student.getParentPhone() : "N/A"}
        };

        int currY = 150;
        for (String[] detail : details) {
            g.setColor(new Color(100, 116, 139)); // Label Slate 500
            g.setFont(new Font("Arial", Font.BOLD, 12));
            g.drawString(detail[0], 200, currY);

            g.setColor(new Color(30, 41, 59)); // Value Slate 800
            g.setFont(new Font("Arial", Font.PLAIN, 13));
            g.drawString(detail[1], 310, currY);

            currY += 24;
        }

        // Principal signature divider line and label
        g.setColor(new Color(200, 200, 200));
        g.drawLine(480, 310, 600, 310);

        g.setColor(new Color(100, 116, 139));
        g.setFont(new Font("Arial", Font.BOLD, 10));
        g.drawString("Principal Sig", 510, 325);

        // Draw simulated signature
        g.setColor(new Color(30, 41, 59));
        g.setFont(new Font("Courier New", Font.ITALIC, 16));
        g.drawString("HappyJourney", 490, 300);

        g.dispose();
        return img;
    }
}
