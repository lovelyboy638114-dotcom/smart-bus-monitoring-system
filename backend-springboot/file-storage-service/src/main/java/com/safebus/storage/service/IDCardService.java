package com.safebus.storage.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

@Service
public class IDCardService {

    private static final int CARD_WIDTH = 640;
    private static final int CARD_HEIGHT = 400;

    public Map<String, String> generateIDCard(Map<String, Object> student) throws Exception {
        String studentId = student.getOrDefault("id", "N/A").toString();

        // Ensure directories exist
        Files.createDirectories(Paths.get("uploads/qr_codes"));
        Files.createDirectories(Paths.get("uploads/id_cards/front"));
        Files.createDirectories(Paths.get("uploads/id_cards/back"));
        Files.createDirectories(Paths.get("uploads/id_cards/pdf"));

        // 1. Generate QR Code offline using ZXing
        String qrPayload = "=== SafeBus AI - Student ID ===\n" +
                "ID: " + studentId + "\n" +
                "Name: " + student.getOrDefault("name", "N/A") + "\n" +
                "Roll No: " + student.getOrDefault("rollNo", "N/A") + "\n" +
                "Class: " + student.getOrDefault("className", "N/A") + "\n" +
                "Status: ACTIVE";

        String qrPathString = "uploads/qr_codes/" + studentId + ".png";
        generateQRCodeImage(qrPayload, 180, 180, qrPathString);

        // 2. Draw Front and Back PVC templates
        BufferedImage frontImage = drawFront(student);
        BufferedImage backImage = drawBack(student, qrPathString);

        // 3. Save PNG templates
        File frontFile = new File("uploads/id_cards/front/" + studentId + "_front.png");
        File backFile = new File("uploads/id_cards/back/" + studentId + "_back.png");
        ImageIO.write(frontImage, "PNG", frontFile);
        ImageIO.write(backImage, "PNG", backFile);

        // 4. Compile into a single 2-page PDF using Apache PDFBox
        String pdfPathString = "uploads/id_cards/pdf/" + studentId + ".pdf";
        compileToPdf(frontImage, backImage, pdfPathString);

        Map<String, String> result = new HashMap<>();
        result.put("front_path", "/uploads/id_cards/front/" + studentId + "_front.png");
        result.put("back_path", "/uploads/id_cards/back/" + studentId + "_back.png");
        result.put("pdf_path", "/uploads/id_cards/pdf/" + studentId + ".pdf");
        return result;
    }

    private void generateQRCodeImage(String text, int width, int height, String filePath) throws Exception {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(text, BarcodeFormat.QR_CODE, width, height);
        Path path = Paths.get(filePath);
        MatrixToImageWriter.writeToPath(bitMatrix, "PNG", path);
    }

    private BufferedImage drawFront(Map<String, Object> student) {
        BufferedImage img = new BufferedImage(CARD_WIDTH, CARD_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();

        // Anti-aliasing for text and shapes
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

        // Draw generic user silhouette avatar inside photo box
        g.setColor(new Color(180, 180, 180));
        g.fillOval(85, 140, 40, 40);
        g.fillArc(65, 185, 80, 80, 0, 180);

        // Draw Student details
        g.setColor(new Color(15, 23, 42)); // Slate 900
        g.setFont(new Font("Arial", Font.BOLD, 20));
        g.drawString(student.getOrDefault("name", "Student Name").toString(), 200, 120);

        g.setFont(new Font("Arial", Font.PLAIN, 13));
        String[][] details = {
            {"Student ID:", student.getOrDefault("id", "N/A").toString()},
            {"Admission No:", student.getOrDefault("admissionNo", "N/A").toString()},
            {"Class & Sec:", student.getOrDefault("className", "N/A").toString() + " - " + student.getOrDefault("section", "A").toString()},
            {"DOB & Gender:", student.getOrDefault("dob", "N/A").toString() + " | " + student.getOrDefault("gender", "N/A").toString()},
            {"Blood Group:", student.getOrDefault("bloodGroup", "N/A").toString()},
            {"Parent Name:", student.getOrDefault("parentName", "N/A").toString()},
            {"Parent Phone:", student.getOrDefault("parentPhone", "N/A").toString()}
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

    private BufferedImage drawBack(Map<String, Object> student, String qrPath) {
        BufferedImage img = new BufferedImage(CARD_WIDTH, CARD_HEIGHT, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();

        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Background
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

        // Thin blue outer border
        g.setColor(new Color(30, 41, 59));
        g.setStroke(new BasicStroke(4));
        g.drawRect(5, 5, CARD_WIDTH - 10, CARD_HEIGHT - 10);

        // Paste QR Code
        try {
            BufferedImage qrImg = ImageIO.read(new File(qrPath));
            g.drawImage(qrImg, 35, 100, 180, 180, null);
        } catch (IOException e) {
            g.setColor(Color.LIGHT_GRAY);
            g.fillRect(35, 100, 180, 180);
            g.setColor(Color.DARK_GRAY);
            g.drawString("QR Placeholder", 75, 190);
        }

        // Heading info (Helplines)
        g.setColor(new Color(15, 23, 42));
        g.setFont(new Font("Arial", Font.BOLD, 16));
        g.drawString("EMERGENCY INFORMATION", 250, 100);

        g.setColor(new Color(239, 68, 68)); // Crimson alert color
        g.setFont(new Font("Arial", Font.BOLD, 13));
        g.drawString("Emergency Helpline: +1-800-555-0199", 250, 135);

        g.setColor(new Color(30, 41, 59));
        g.setFont(new Font("Arial", Font.PLAIN, 12));
        g.drawString("Transport Helpline: +1-800-555-0100", 250, 165);

        // Instructions
        g.setFont(new Font("Arial", Font.BOLD, 12));
        g.drawString("Instructions:", 250, 205);
        g.setFont(new Font("Arial", Font.PLAIN, 11));
        g.drawString("1. This card is non-transferable and remains property of school.", 250, 225);
        g.drawString("2. Report loss of this card immediately to administration.", 250, 245);
        g.drawString("3. Always scan this QR badge when boarding/dropping the bus.", 250, 265);

        // Footer banner info
        g.setColor(new Color(241, 245, 249)); // Light grey footer
        g.fillRect(10, 330, CARD_WIDTH - 20, 60);

        g.setColor(new Color(71, 85, 105));
        g.setFont(new Font("Arial", Font.PLAIN, 11));
        g.drawString("School Address: 123 Smart Safety Way, Tech City", 25, 350);
        g.drawString("Website: www.happyjourney.edu | Email: transport@happyjourney.edu", 25, 370);

        g.dispose();
        return img;
    }

    private void compileToPdf(BufferedImage front, BufferedImage back, String pdfPath) throws Exception {
        try (PDDocument doc = new PDDocument()) {
            // Page 1: Front
            PDPage page1 = new PDPage(new PDRectangle(CARD_WIDTH, CARD_HEIGHT));
            doc.addPage(page1);
            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page1)) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(front, "png", baos);
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, baos.toByteArray(), "front");
                contentStream.drawImage(pdImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            }

            // Page 2: Back
            PDPage page2 = new PDPage(new PDRectangle(CARD_WIDTH, CARD_HEIGHT));
            doc.addPage(page2);
            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page2)) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(back, "png", baos);
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, baos.toByteArray(), "back");
                contentStream.drawImage(pdImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            }

            doc.save(new File(pdfPath));
        }
    }
}
