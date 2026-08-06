import os
import urllib.request
import urllib.parse
import io
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

class CredentialPDFService:
    @classmethod
    def _get_font(cls, size, bold=False):
        font_names = []
        if bold:
            font_names = ["arialbd.ttf", "segoeuib.ttf", "courbd.ttf", "timesbd.ttf"]
        else:
            font_names = ["arial.ttf", "SegoeUI.ttf", "cour.ttf", "times.ttf"]
            
        for name in font_names:
            try:
                return ImageFont.truetype(name, size)
            except IOError:
                continue
        return ImageFont.load_default()

    @classmethod
    def generate_pdf(cls, name, role, username, temp_password, target_id):
        """
        Generates a beautifully structured provisioning sheet PDF containing credentials,
        school branding details, security warning labels, and direct login portal QR codes.
        """
        # Base canvas dimensions: A4 format scale (800 x 1100)
        img = Image.new("RGBA", (800, 1100), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # 1. Header Banner (Dark Blue brand theme)
        draw.rectangle((0, 0, 800, 140), fill=(29, 78, 216, 255))
        draw.rectangle((0, 140, 800, 145), fill=(245, 158, 11, 255)) # Yellow accent line
        
        font_title = cls._get_font(26, bold=True)
        font_subtitle = cls._get_font(13, bold=False)
        draw.text((40, 35), "HappyJourney Academy", fill=(255, 255, 255, 255), font=font_title)
        draw.text((40, 78), "AI-Powered Student Safety & Transit Console System", fill=(226, 232, 240, 255), font=font_subtitle)
        
        # 2. Main Title
        font_section = cls._get_font(18, bold=True)
        draw.text((40, 180), "SECURE ACCOUNT PROVISIONING SHEET", fill=(30, 41, 59, 255), font=font_section)
        draw.line([(40, 215), (760, 215)], fill=(226, 232, 240, 255), width=2)
        
        # 3. Profile details section
        font_label = cls._get_font(11, bold=True)
        font_value = cls._get_font(13, bold=False)
        
        details = [
            ("ACCOUNT OWNER", name),
            ("SYSTEM ROLE", role.upper()),
            ("UNIQUE USERNAME / EMAIL", username),
            ("TEMPORARY PASSWORD", temp_password)
        ]
        
        curr_y = 240
        for label, val in details:
            if "PASSWORD" in label or "USERNAME" in label:
                # Highlighted credentials block
                draw.rectangle((40, curr_y, 760, curr_y + 45), fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=1)
                draw.text((60, curr_y + 14), label + ":", fill=(100, 116, 139, 255), font=font_label)
                is_bold = "PASSWORD" in label
                draw.text((280, curr_y + 13), val, fill=(15, 23, 42, 255), font=cls._get_font(13, bold=is_bold))
                curr_y += 65
            else:
                draw.text((40, curr_y + 8), label + ":", fill=(100, 116, 139, 255), font=font_label)
                draw.text((280, curr_y + 8), val, fill=(15, 23, 42, 255), font=font_value)
                curr_y += 45
                
        # 4. Security Instructions Box
        draw.rectangle((40, curr_y + 10, 760, curr_y + 160), fill=(254, 242, 242, 255), outline=(254, 226, 226, 255), width=1)
        font_warn_title = cls._get_font(11, bold=True)
        font_warn_text = cls._get_font(10, bold=False)
        draw.text((60, curr_y + 25), "CRITICAL SECURITY INSTRUCTIONS:", fill=(153, 27, 27, 255), font=font_warn_title)
        
        warn_msg = (
            "1. This sheet contains temporary login credentials generated automatically by the system.\n"
            "2. For security compliance, you are required to change your password immediately upon first login.\n"
            "3. Keep this sheet secure. Never disclose your temporary credentials or password to third parties.\n"
            "4. Contact the school transport helpdesk for account queries, locking issues, or support."
        )
        draw.text((60, curr_y + 55), warn_msg, fill=(185, 28, 28, 255), font=font_warn_text)
        
        # 5. QR Code for direct portal login
        qr_loaded = False
        portal_url = "http://localhost:5173/login"
        try:
            url = f"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={urllib.parse.quote(portal_url)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                qr_img = Image.open(io.BytesIO(response.read()))
                img.paste(qr_img, (40, curr_y + 190))
                qr_loaded = True
        except Exception:
            pass
            
        if not qr_loaded:
            draw.rectangle((40, curr_y + 190, 220, curr_y + 370), outline=(226, 232, 240, 255), width=2, fill=(248, 250, 252, 255))
            draw.text((75, curr_y + 270), "[ Portal QR Code ]", fill=(100, 116, 139, 255), font=cls._get_font(10, bold=False))
            
        draw.text((250, curr_y + 220), "SCAN TO ACCESS PORTAL", fill=(30, 41, 59, 255), font=cls._get_font(12, bold=True))
        instr_p = (
            "Point your smartphone camera at this QR code to be redirected\n"
            "directly to the SafeBus Portal login page.\n\n"
            "Supported Devices: Apple iOS camera, Android Lens, Web browsers."
        )
        draw.text((250, curr_y + 245), instr_p, fill=(71, 85, 105, 255), font=cls._get_font(10, bold=False))
        
        # Footer
        draw.line([(40, 1020), (760, 1020)], fill=(226, 232, 240, 255), width=1)
        draw.text((40, 1035), "SafeBus AI Security Services | HappyJourney Transport Division", fill=(148, 163, 184, 255), font=cls._get_font(9, bold=False))
        
        # Save as PDF
        pdf_dir = Path("uploads/credentials")
        pdf_dir.mkdir(parents=True, exist_ok=True)
        pdf_filename = f"{target_id}_credentials.pdf"
        pdf_path = pdf_dir / pdf_filename
        
        # Convert to RGB and save
        rgb_img = img.convert("RGB")
        rgb_img.save(str(pdf_path), "PDF")
        
        return f"/uploads/credentials/{pdf_filename}"
