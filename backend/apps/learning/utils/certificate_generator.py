"""
Certificate PDF Generator Utility

Generates downloadable PDF certificates when users complete career paths.
Uses Pillow for image manipulation and ReportLab for PDF generation.
"""
import os
import uuid
from datetime import datetime
from django.conf import settings


def generate_certificate_pdf(certificate, career_path):
    """
    Generate a PDF certificate for a completed career path.
    
    Args:
        certificate: Certificate model instance
        career_path: CareerPath model instance
        
    Returns:
        str: URL path to the generated PDF, or None if generation failed
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
        from io import BytesIO
        
        # Get user info
        user = certificate.user
        user_name = f"{user.first_name} {user.last_name}".strip() or user.username
        
        # Create certificates directory if not exists
        cert_dir = os.path.join(settings.MEDIA_ROOT, 'certificates', 'issued')
        os.makedirs(cert_dir, exist_ok=True)
        
        # Generate unique filename
        filename = f"cert_{certificate.certificate_id}_{uuid.uuid4().hex[:8]}.png"
        filepath = os.path.join(cert_dir, filename)
        
        # Check if career path has a custom template
        if career_path.certificate_template and hasattr(career_path.certificate_template, 'path'):
            template_path = career_path.certificate_template.path
            if os.path.exists(template_path):
                # Use custom template
                img = Image.open(template_path).convert('RGBA')
            else:
                img = _create_default_certificate(career_path)
        else:
            # Create default certificate
            img = _create_default_certificate(career_path)
        
        # Draw text on certificate
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        # Try to load fonts (fallback to default if not available)
        try:
            # Try common system fonts
            title_font = ImageFont.truetype("arial.ttf", 48)
            name_font = ImageFont.truetype("arial.ttf", 64)
            detail_font = ImageFont.truetype("arial.ttf", 32)
        except (OSError, IOError):
            try:
                # Try DejaVu fonts (common on Linux)
                title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
                name_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 64)
                detail_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
            except (OSError, IOError):
                # Use default font
                title_font = ImageFont.load_default()
                name_font = ImageFont.load_default()
                detail_font = ImageFont.load_default()
        
        # Colors
        text_color = (30, 41, 59)  # Dark slate
        accent_color = (99, 102, 241)  # Indigo
        
        # Draw "Certificate of Completion"
        _draw_centered_text(draw, "CERTIFICATE OF COMPLETION", title_font, text_color, width, height * 0.15)
        
        # Draw "This is to certify that"
        _draw_centered_text(draw, "This is to certify that", detail_font, text_color, width, height * 0.30)
        
        # Draw user name (large)
        _draw_centered_text(draw, user_name.upper(), name_font, accent_color, width, height * 0.42)
        
        # Draw "has successfully completed"
        _draw_centered_text(draw, "has successfully completed", detail_font, text_color, width, height * 0.53)
        
        # Draw course name
        _draw_centered_text(draw, career_path.name, name_font, text_color, width, height * 0.65)
        
        # Draw date
        date_str = datetime.now().strftime("%B %d, %Y")
        _draw_centered_text(draw, f"Issued on {date_str}", detail_font, text_color, width, height * 0.80)
        
        # Draw certificate ID
        _draw_centered_text(draw, f"Certificate ID: {certificate.certificate_id}", detail_font, (148, 163, 184), width, height * 0.90)
        
        # Save image
        img = img.convert('RGB')
        img.save(filepath, 'PNG', quality=95)
        
        # Return the URL path
        relative_path = f'/media/certificates/issued/{filename}'
        return relative_path
        
    except ImportError as e:
        print(f"Pillow not installed, cannot generate certificate: {e}")
        return None
    except Exception as e:
        print(f"Error generating certificate: {e}")
        import traceback
        traceback.print_exc()
        return None


def _create_default_certificate(career_path):
    """Create a default certificate template image"""
    from PIL import Image, ImageDraw
    
    # Create a nice gradient background
    width, height = 1200, 850
    img = Image.new('RGB', (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw gradient background (subtle)
    for y in range(height):
        r = int(248 - (y / height) * 10)
        g = int(250 - (y / height) * 10)
        b = int(252 - (y / height) * 5)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    # Draw border
    border_color = (99, 102, 241)  # Indigo
    draw.rectangle([20, 20, width-20, height-20], outline=border_color, width=3)
    draw.rectangle([30, 30, width-30, height-30], outline=border_color, width=1)
    
    # Draw decorative corners
    corner_size = 50
    # Top left
    draw.line([(30, 30), (30 + corner_size, 30)], fill=border_color, width=3)
    draw.line([(30, 30), (30, 30 + corner_size)], fill=border_color, width=3)
    # Top right
    draw.line([(width-30, 30), (width-30-corner_size, 30)], fill=border_color, width=3)
    draw.line([(width-30, 30), (width-30, 30 + corner_size)], fill=border_color, width=3)
    # Bottom left
    draw.line([(30, height-30), (30 + corner_size, height-30)], fill=border_color, width=3)
    draw.line([(30, height-30), (30, height-30-corner_size)], fill=border_color, width=3)
    # Bottom right
    draw.line([(width-30, height-30), (width-30-corner_size, height-30)], fill=border_color, width=3)
    draw.line([(width-30, height-30), (width-30, height-30-corner_size)], fill=border_color, width=3)
    
    return img


def _draw_centered_text(draw, text, font, color, width, y):
    """Draw centered text at specified y position"""
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
    except AttributeError:
        # Fallback for older Pillow versions
        text_width = len(text) * 10  # Rough estimate
    
    x = (width - text_width) / 2
    draw.text((x, y), text, font=font, fill=color)
