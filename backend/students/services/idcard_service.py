import os
import json
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageDraw, ImageFont

class IDCardService:
    CARD_WIDTH = 640
    CARD_HEIGHT = 400

    @staticmethod
    def _load_config():
        config_path = Path("config/school_config.json")
        if config_path.exists():
            with open(config_path, "r") as f:
                return json.load(f)
        return {
            "school_name": "HappyJourney Academy",
            "school_motto": "Safe Journeys, Smart Minds",
            "school_logo": "school_logo.png",
            "principal_signature": "principal_signature.png",
            "school_seal": "school_seal.png",
            "school_address": "123 Smart Safety Way, Tech City",
            "emergency_number": "+1-800-555-0199",
            "transport_helpline": "+1-800-555-0100",
            "website": "www.happyjourney.edu",
            "email": "transport@happyjourney.edu"
        }

    @staticmethod
    def _get_font(size=14, bold=False):
        font_names = ["arialbd.ttf" if bold else "arial.ttf", "segoeuib.ttf" if bold else "segoeui.ttf", "Helvetica.ttf", "DejaVuSans.ttf"]
        for name in font_names:
            try:
                if os.name == 'nt':
                    font_path = Path("C:/Windows/Fonts") / name
                    if font_path.exists():
                        return ImageFont.truetype(str(font_path), size)
                return ImageFont.truetype(name, size)
            except Exception:
                continue
        return ImageFont.load_default()

    @classmethod
    def _get_or_create_qr(cls, student_id, student_data=None):
        qr_dir = Path("uploads/qr_codes")
        qr_dir.mkdir(parents=True, exist_ok=True)
        qr_path = qr_dir / f"{student_id}.png"
        
        # We delete pre-existing generic QR code images to ensure they rebuild with the new rich details
        if qr_path.exists():
            try:
                os.remove(qr_path)
            except Exception:
                pass
            
        import urllib.request
        import urllib.parse
        try:
            if student_data:
                name = student_data.get("name") or "Student"
                roll = student_data.get("rollNo") or "N/A"
                cls_name = student_data.get("class_name") or "N/A"
                payload = f"=== SafeBus AI - Student ID ===\nID: {student_id}\nName: {name}\nRoll No: {roll}\nClass: {cls_name}\nStatus: ACTIVE"
            else:
                payload = f"SafeBus Student ID: {student_id}"
                
            url = f"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data={urllib.parse.quote(payload)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                with open(qr_path, "wb") as f:
                    f.write(response.read())
            return f"/uploads/qr_codes/{student_id}.png"
        except Exception as e:
            import logging
            logging.getLogger("safebus-idcard").warning(f"Could not retrieve QR code for {student_id}: {e}")
            return None

    @classmethod
    def generate_id_card(cls, student_data, qr_path):
        """
        Generates front and back card images, and compiles them into a single PDF.
        All files are stored under uploads/id_cards/.
        """
        config = cls._load_config()
        student_id = student_data.get("student_id") or student_data.get("id")
        
        # Ensure directories exist
        upload_dir = Path("uploads/id_cards")
        (upload_dir / "front").mkdir(parents=True, exist_ok=True)
        (upload_dir / "back").mkdir(parents=True, exist_ok=True)
        (upload_dir / "pdf").mkdir(parents=True, exist_ok=True)
        
        # Generate or locate QR code
        if not qr_path or not Path(qr_path.lstrip("/")).exists():
            qr_path = cls._get_or_create_qr(student_id, student_data)
            
        front_img = cls._draw_front(student_data, config)
        back_img = cls._draw_back(student_data, config, qr_path)
        
        # Save PNG images
        front_path = upload_dir / "front" / f"{student_id}_front.png"
        back_path = upload_dir / "back" / f"{student_id}_back.png"
        pdf_path = upload_dir / "pdf" / f"{student_id}.pdf"
        
        front_img.save(str(front_path), "PNG")
        back_img.save(str(back_path), "PNG")
        
        # Compile to PDF using Pillow
        # Front and Back images are combined as two pages in the output PDF
        front_pdf_page = front_img.convert("RGB")
        back_pdf_page = back_img.convert("RGB")
        front_pdf_page.save(str(pdf_path), "PDF", save_all=True, append_images=[back_pdf_page])
        
        return {
            "front_path": f"/uploads/id_cards/front/{student_id}_front.png",
            "back_path": f"/uploads/id_cards/back/{student_id}_back.png",
            "pdf_path": f"/uploads/id_cards/pdf/{student_id}.pdf"
        }

    @classmethod
    def _draw_front(cls, student, config):
        # 640x400 landscape PVC card
        img = Image.new("RGBA", (cls.CARD_WIDTH, cls.CARD_HEIGHT), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        assets_dir = Path("assets/id_card")
        
        # Draw base template if exists, else draw custom gradient banner
        template_path = assets_dir / "front_template.png"
        if template_path.exists():
            try:
                base = Image.open(str(template_path)).resize((cls.CARD_WIDTH, cls.CARD_HEIGHT))
                img.paste(base, (0, 0), base if base.mode == "RGBA" else None)
            except Exception:
                cls._draw_default_banner(draw)
        else:
            cls._draw_default_banner(draw)
            
        # Draw header text (School Branding)
        font_school = cls._get_font(22, bold=True)
        font_motto = cls._get_font(12, bold=False)
        
        draw.text((120, 15), config.get("school_name", "HappyJourney Academy"), fill=(255, 255, 255, 255), font=font_school)
        draw.text((120, 45), config.get("school_motto", "Safe Journeys, Smart Minds"), fill=(200, 220, 255, 255), font=font_motto)
        
        # Composite School Logo
        logo_file = assets_dir / config.get("school_logo", "school_logo.png")
        if logo_file.exists():
            try:
                logo = Image.open(str(logo_file)).resize((80, 60))
                img.paste(logo, (20, 10), logo if logo.mode == "RGBA" else None)
            except Exception:
                pass
                
        # Draw student photo
        photo_box = (35, 110, 175, 275) # Width 140, Height 165
        draw.rectangle(photo_box, outline=(200, 200, 200, 255), width=2, fill=(240, 240, 240, 255))
        
        photo_loaded = False
        if student.get("photo"):
            photo_path = Path(student["photo"].lstrip("/"))
            if photo_path.exists():
                try:
                    photo = Image.open(str(photo_path)).resize((140, 165))
                    img.paste(photo, (35, 110))
                    photo_loaded = True
                except Exception:
                    pass
                    
        if not photo_loaded:
            # Draw placeholder user icon
            draw.ellipse((85, 140, 125, 180), fill=(180, 180, 180, 255))
            draw.chord((65, 185, 145, 235), 180, 360, fill=(180, 180, 180, 255))
            
        # Draw student details
        font_name = cls._get_font(20, bold=True)
        font_lbl = cls._get_font(12, bold=True)
        font_val = cls._get_font(13, bold=False)
        
        draw.text((200, 100), student.get("name", "N/A"), fill=(15, 23, 42, 255), font=font_name)
        
        details = [
            ("Student ID:", str(student.get("student_id") or student.get("id") or "N/A")),
            ("Admission No:", str(student.get("admission_no") or "N/A")),
            ("Class & Sec:", f"{student.get('class_name') or 'N/A'} - {student.get('section') or 'N/A'}"),
            ("DOB & Gender:", f"{student.get('dob') or 'N/A'} | {student.get('gender') or 'N/A'}"),
            ("Blood Group:", str(student.get("bloodGroup") or "N/A")),
            ("Parent Name:", str(student.get("parentName") or "N/A")),
            ("Parent Phone:", str(student.get("parentPhone") or "N/A"))
        ]
        
        curr_y = 135
        for lbl, val in details:
            draw.text((200, curr_y), lbl, fill=(100, 116, 139, 255), font=font_lbl)
            draw.text((310, curr_y), val, fill=(30, 41, 59, 255), font=font_val)
            curr_y += 24
            
        # Draw principal signature
        sig_file = assets_dir / config.get("principal_signature", "principal_signature.png")
        if sig_file.exists():
            try:
                sig = Image.open(str(sig_file)).resize((100, 45))
                img.paste(sig, (480, 315), sig if sig.mode == "RGBA" else None)
            except Exception:
                pass
                
        font_sig_lbl = cls._get_font(10, bold=True)
        draw.line((480, 310, 580, 310), fill=(150, 150, 150, 255), width=1)
        draw.text((495, 315), "Principal Sig", fill=(100, 116, 139, 255), font=font_sig_lbl)
        
        # Composite School Seal watermark (rotated transparent watermark)
        seal_file = assets_dir / config.get("school_seal", "school_seal.png")
        if seal_file.exists():
            try:
                seal = Image.open(str(seal_file)).resize((90, 90))
                # Paste at bottom-left corner overlay
                img.paste(seal, (370, 290), seal if seal.mode == "RGBA" else None)
            except Exception:
                pass
                
        return img

    @classmethod
    def _draw_back(cls, student, config, qr_path):
        img = Image.new("RGBA", (cls.CARD_WIDTH, cls.CARD_HEIGHT), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        assets_dir = Path("assets/id_card")
        
        # Draw back template if exists
        template_path = assets_dir / "back_template.png"
        if template_path.exists():
            try:
                base = Image.open(str(template_path)).resize((cls.CARD_WIDTH, cls.CARD_HEIGHT))
                img.paste(base, (0, 0), base if base.mode == "RGBA" else None)
            except Exception:
                cls._draw_default_borders(draw)
        else:
            cls._draw_default_borders(draw)
            
        # Load and paste QR code (centered on the left side)
        qr_loaded = False
        if qr_path:
            full_qr_path = Path(qr_path.lstrip("/"))
            if full_qr_path.exists():
                try:
                    qr_img = Image.open(str(full_qr_path)).resize((180, 180))
                    img.paste(qr_img, (35, 100))
                    qr_loaded = True
                except Exception:
                    pass
                    
        if not qr_loaded:
            # Draw QR Placeholder box
            draw.rectangle((35, 100, 215, 280), outline=(200, 200, 200, 255), width=2, fill=(245, 245, 245, 255))
            font_qr_lbl = cls._get_font(12, bold=False)
            draw.text((80, 180), "[ QR Code ]", fill=(150, 150, 150, 255), font=font_qr_lbl)
            
        # Draw details on the right side
        font_header = cls._get_font(15, bold=True)
        font_lbl = cls._get_font(11, bold=True)
        font_val = cls._get_font(12, bold=False)
        font_instr = cls._get_font(11, bold=False)
        
        draw.text((250, 40), "TRANSPORTATION & SERVICES CARD", fill=(29, 78, 216, 255), font=font_header)
        
        details = [
            ("School Address:", config.get("school_address", "123 Smart Safety Way, Tech City")),
            ("Emergency Contact:", config.get("emergency_number", "+1-800-555-0199")),
            ("Transport Helpline:", config.get("transport_helpline", "+1-800-555-0100")),
            ("Website:", config.get("website", "www.happyjourney.edu")),
            ("Support Email:", config.get("email", "transport@happyjourney.edu"))
        ]
        
        curr_y = 90
        for lbl, val in details:
            draw.text((250, curr_y), lbl, fill=(100, 116, 139, 255), font=font_lbl)
            # Wrap long addresses if needed
            if len(val) > 40:
                draw.text((250, curr_y + 16), val[:40] + "...", fill=(30, 41, 59, 255), font=font_val)
                curr_y += 38
            else:
                draw.text((380, curr_y), val, fill=(30, 41, 59, 255), font=font_val)
                curr_y += 24
                
        # Draw instructions text at the bottom
        draw.line((250, 310, 600, 310), fill=(200, 200, 200, 255), width=1)
        draw.text((250, 320), "INSTRUCTIONS:", fill=(15, 23, 42, 255), font=cls._get_font(10, bold=True))
        
        instruction_text = "Scan this QR code for Student Verification and Attendance.\nThis card is non-transferable. If found, return to transport office."
        draw.text((250, 340), instruction_text, fill=(71, 85, 105, 255), font=font_instr)
        
        return img

    @staticmethod
    def _draw_default_banner(draw):
        # Draw top header gradient bar (Dark Blue)
        for i in range(80):
            r = int(29 - (i * 0.1))
            g = int(78 - (i * 0.2))
            b = int(216 - (i * 0.3))
            draw.line([(0, i), (640, i)], fill=(r, g, b, 255))
            
        # Draw yellow line accent
        draw.line([(0, 80), (640, 80)], fill=(245, 158, 11, 255), width=3)
        
        # Rounded card borders overlay
        draw.rectangle((0, 0, 638, 398), outline=(29, 78, 216, 255), width=3)

    @staticmethod
    def _draw_default_borders(draw):
        # Draw top header blue line accent
        draw.rectangle((0, 0, 640, 25), fill=(29, 78, 216, 255))
        draw.line([(0, 25), (640, 25)], fill=(245, 158, 11, 255), width=3)
        
        # Rounded card borders overlay
        draw.rectangle((0, 0, 638, 398), outline=(29, 78, 216, 255), width=3)
