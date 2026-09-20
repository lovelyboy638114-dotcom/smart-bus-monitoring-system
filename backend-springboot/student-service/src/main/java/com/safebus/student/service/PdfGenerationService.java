package com.safebus.student.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class PdfGenerationService {

    private static final int CARD_WIDTH = 640;
    private static final int CARD_HEIGHT = 400;

    public byte[] compileToPdfBytes(BufferedImage front, BufferedImage back) throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            // Page 1: Front
            PDPage page1 = new PDPage(new PDRectangle(CARD_WIDTH, CARD_HEIGHT));
            doc.addPage(page1);
            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page1)) {
                ByteArrayOutputStream imgBaos = new ByteArrayOutputStream();
                ImageIO.write(front, "png", imgBaos);
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, imgBaos.toByteArray(), "front");
                contentStream.drawImage(pdImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            }

            // Page 2: Back
            PDPage page2 = new PDPage(new PDRectangle(CARD_WIDTH, CARD_HEIGHT));
            doc.addPage(page2);
            try (PDPageContentStream contentStream = new PDPageContentStream(doc, page2)) {
                ByteArrayOutputStream imgBaos = new ByteArrayOutputStream();
                ImageIO.write(back, "png", imgBaos);
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, imgBaos.toByteArray(), "back");
                contentStream.drawImage(pdImage, 0, 0, CARD_WIDTH, CARD_HEIGHT);
            }

            doc.save(baos);
            return baos.toByteArray();
        }
    }

    public boolean validatePdf(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            return doc.getNumberOfPages() == 2;
        } catch (IOException e) {
            return false;
        }
    }
}
