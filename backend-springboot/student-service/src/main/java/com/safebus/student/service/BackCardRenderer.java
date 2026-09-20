package com.safebus.student.service;

import com.safebus.student.entity.Student;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;

@Component
public class BackCardRenderer {

    private static final int CARD_WIDTH = 640;
    private static final int CARD_HEIGHT = 400;

    public BufferedImage renderBack(Student student, byte[] qrBytes) {
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
            BufferedImage qrImg = ImageIO.read(new ByteArrayInputStream(qrBytes));
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
}
