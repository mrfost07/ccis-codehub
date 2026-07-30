"""
Completion-certificate renderer.

One design, composed here. The institutional marks, the university and college
names, the CEO block and the certificate ID are fixed; the only per-path
variable is CareerPath.certificate_title, and the instructor name comes from
CareerPath.instructor. That is deliberate: a second design would drift from
this one, and the preview shown while creating a path would stop matching what
students actually receive.

CareerPath.certificate_template is intentionally ignored. It used to be opened
as a background image, which meant:
  - a .pdf upload (the modal accepted them, Pillow cannot read them) raised
    inside a bare `except Exception`, returned None, and the certificate
    silently never appeared;
  - text was drawn at hardcoded 48/64/32px on whatever size the upload was, so
    a long name or path title ran off the edge with no wrapping or fitting.
The column is kept so no uploaded file is lost, but nothing reads it.

Public entry point keeps its original name and signature because three call
sites depend on it, and returns the media-relative URL of the PNG. A PDF is
written alongside for printing.

    generate_certificate_pdf(certificate, career_path) -> '/media/.../x.png'
"""
import logging
import os
from datetime import datetime

from django.conf import settings

logger = logging.getLogger(__name__)

# ── Canvas ────────────────────────────────────────────────────────────────────
WIDTH, HEIGHT = 2000, 1414          # A4 landscape at ~170dpi, prints cleanly
CREAM = (253, 250, 244)
INK = (41, 37, 36)
MUTED = (120, 113, 108)
VIOLET = (91, 33, 182)
GOLD = (180, 142, 63)

ASSET_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'certificate_assets')
SIGNATURE_PATH = os.path.join(
    settings.MEDIA_ROOT, 'certificates', 'signatures', 'ceo-signature.png'
)

CEO_NAME = 'Mark Renier B. Fostanes'
CEO_TITLE = 'Chief Executive Officer, CCIS-CodeHub'
UNIVERSITY = 'SURIGAO DEL NORTE STATE UNIVERSITY'
COLLEGE = 'College of Computing and Information Sciences'
DEFAULT_TITLE = 'Certificate of Completion'

# Font resolution: bundled first so the look is identical on every machine,
# then common Linux families, then Pillow's own scalable default. The previous
# version ended at ImageFont.load_default() with NO size, which is an 11px
# bitmap - on a server without arial or DejaVu every certificate rendered with
# microscopic text at 64px positions.
_SERIF_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf',
    'C:/Windows/Fonts/georgiab.ttf',
    'C:/Windows/Fonts/timesbd.ttf',
]
_SANS_CANDIDATES = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/arial.ttf',
]


def _bundled(*keywords):
    """A bundled font whose filename contains all keywords, if one exists."""
    fonts_dir = os.path.join(ASSET_DIR, 'fonts')
    if not os.path.isdir(fonts_dir):
        return None
    for name in sorted(os.listdir(fonts_dir)):
        lowered = name.lower()
        if lowered.endswith(('.ttf', '.otf')) and all(k in lowered for k in keywords):
            return os.path.join(fonts_dir, name)
    return None


def _resolve(candidates, *keywords):
    return (
        _bundled(*keywords)
        or _bundled()
        or next((path for path in candidates if os.path.exists(path)), None)
    )


class Fonts:
    """Lazily resolved font pair, with a scalable fallback that stays legible."""

    def __init__(self):
        self.serif = _resolve(_SERIF_CANDIDATES, 'bold')
        self.sans = _resolve(_SANS_CANDIDATES, 'regular')
        logger.info('certificate fonts: serif=%s sans=%s', self.serif, self.sans)

    def load(self, family, size):
        from PIL import ImageFont

        path = self.serif if family == 'serif' else self.sans
        if path:
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                logger.warning('could not load font %s, falling back', path)
        # Scalable since Pillow 10.1 - plain, but readable at any size.
        return ImageFont.load_default(size=size)

    def fit(self, draw, text, family, max_width, size, minimum=18):
        """Largest size at or below `size` where `text` fits `max_width`."""
        while size > minimum:
            font = self.load(family, size)
            if draw.textlength(text, font=font) <= max_width:
                return font
            size -= 2
        return self.load(family, minimum)


def _centre(draw, text, font, fill, y, width=WIDTH):
    draw.text(((width - draw.textlength(text, font=font)) / 2, y), text, font=font, fill=fill)


def _tracked(draw, text, font, fill, y, spacing, width=WIDTH):
    """Letter-spaced centred text, for the institutional header."""
    widths = [draw.textlength(ch, font=font) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = (width - total) / 2
    for ch, w in zip(text, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + spacing


def _paste_contained(canvas, path, centre_x, centre_y, box):
    """Paste an RGBA asset scaled to fit `box`, centred. Silently skips if absent."""
    if not os.path.exists(path):
        logger.warning('certificate asset missing: %s', path)
        return 0
    from PIL import Image

    art = Image.open(path).convert('RGBA')
    scale = min(box / art.width, box / art.height)
    art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))),
                     Image.LANCZOS)
    canvas.paste(art, (round(centre_x - art.width / 2), round(centre_y - art.height / 2)), art)
    return art.height


def render_certificate(certificate, career_path):
    """Compose the certificate and return it as an RGB image."""
    from PIL import Image, ImageDraw

    fonts = Fonts()
    canvas = Image.new('RGB', (WIDTH, HEIGHT), CREAM)
    draw = ImageDraw.Draw(canvas)

    # Borders: a heavy violet rule with a fine gold companion inside it.
    draw.rectangle([44, 44, WIDTH - 44, HEIGHT - 44], outline=VIOLET, width=7)
    draw.rectangle([64, 64, WIDTH - 64, HEIGHT - 64], outline=GOLD, width=2)
    for x, y, dx, dy in ((64, 64, 1, 1), (WIDTH - 64, 64, -1, 1),
                         (64, HEIGHT - 64, 1, -1), (WIDTH - 64, HEIGHT - 64, -1, -1)):
        draw.line([(x, y), (x + 70 * dx, y)], fill=VIOLET, width=5)
        draw.line([(x, y), (x, y + 70 * dy)], fill=VIOLET, width=5)

    # Seals, flanking the header.
    _paste_contained(canvas, os.path.join(ASSET_DIR, 'snsu-logo.png'), 300, 250, 230)
    _paste_contained(canvas, os.path.join(ASSET_DIR, 'ccis-logo.png'), WIDTH - 300, 250, 230)

    _tracked(draw, UNIVERSITY, fonts.load('serif', 40), INK, 190, 5)
    _centre(draw, COLLEGE, fonts.load('sans', 30), MUTED, 254)

    title = (getattr(career_path, 'certificate_title', '') or DEFAULT_TITLE).strip()
    title_font = fonts.fit(draw, title.upper(), 'serif', WIDTH - 700, 92)
    _centre(draw, title.upper(), title_font, VIOLET, 400)
    draw.line([(WIDTH / 2 - 190, 520), (WIDTH / 2 + 190, 520)], fill=GOLD, width=3)

    _centre(draw, 'This is to certify that', fonts.load('sans', 34), MUTED, 580)

    user = certificate.user
    student = (f'{user.first_name} {user.last_name}'.strip() or user.username).upper()
    _centre(draw, student, fonts.fit(draw, student, 'serif', WIDTH - 500, 96), INK, 660)
    draw.line([(360, 790), (WIDTH - 360, 790)], fill=MUTED, width=2)

    _centre(draw, 'has successfully completed the learning path',
            fonts.load('sans', 34), MUTED, 830)
    path_name = career_path.name
    _centre(draw, path_name, fonts.fit(draw, path_name, 'serif', WIDTH - 500, 62), VIOLET, 900)

    issued = getattr(certificate, 'issued_at', None) or datetime.now()
    _centre(draw, f'Issued on {issued.strftime("%B %d, %Y")}',
            fonts.load('sans', 30), MUTED, 1000)

    # Signature blocks. Instructor left, CEO right with the scanned signature
    # sitting above the rule.
    #
    # The vertical rhythm below is deliberate: signature art, rule, name, role,
    # then the reference band. The first attempt put the rule at 1210 and the
    # certificate ID at HEIGHT-150, which are only eight pixels apart, so the ID
    # collided with "Chief Executive Officer". Keep at least 50px between the
    # role labels and the reference band when adjusting these.
    line_y = 1150
    for centre_x, name, role, signature in (
        (560, _instructor_name(career_path), 'Course Instructor', None),
        (WIDTH - 560, CEO_NAME, CEO_TITLE, SIGNATURE_PATH),
    ):
        if signature:
            _paste_contained(canvas, signature, centre_x, line_y - 74, 170)
        draw.line([(centre_x - 300, line_y), (centre_x + 300, line_y)], fill=INK, width=2)
        name_font = fonts.fit(draw, name, 'serif', 580, 36)
        draw.text((centre_x - draw.textlength(name, font=name_font) / 2, line_y + 16),
                  name, font=name_font, fill=INK)
        role_font = fonts.load('sans', 24)
        draw.text((centre_x - draw.textlength(role, font=role_font) / 2, line_y + 60),
                  role, font=role_font, fill=MUTED)

    # Sits in the clear channel between the two signature rules.
    _paste_contained(canvas, os.path.join(ASSET_DIR, 'codehub-logo-dark.png'),
                     WIDTH / 2, line_y - 30, 86)

    reference = f'Certificate ID  {certificate.certificate_id}'
    _centre(draw, reference, fonts.load('sans', 24), MUTED, HEIGHT - 128)
    _centre(draw, 'Verify this certificate at ccis-codehub.space',
            fonts.load('sans', 21), MUTED, HEIGHT - 92)
    return canvas


def _instructor_name(career_path):
    instructor = getattr(career_path, 'instructor', None)
    if instructor is None:
        return 'CCIS-CodeHub Faculty'
    return f'{instructor.first_name} {instructor.last_name}'.strip() or instructor.username


def generate_certificate_pdf(certificate, career_path):
    """
    Render and store the certificate.

    Returns the media-relative URL of the PNG, which callers assign to
    Certificate.pdf_url, or None if rendering failed. A PDF of the same image is
    written beside it for printing.

    The filename is derived from certificate_id rather than a random suffix, so
    regenerating replaces the file instead of leaving an orphan behind every
    time the claim endpoint is called.
    """
    try:
        target_dir = os.path.join(settings.MEDIA_ROOT, 'certificates', 'issued')
        os.makedirs(target_dir, exist_ok=True)

        safe_id = ''.join(c if c.isalnum() or c in '-_' else '-'
                          for c in str(certificate.certificate_id))
        stem = f'cert_{safe_id}'

        image = render_certificate(certificate, career_path)
        image.save(os.path.join(target_dir, f'{stem}.png'), 'PNG')
        image.save(os.path.join(target_dir, f'{stem}.pdf'), 'PDF', resolution=170.0)

        return f'/media/certificates/issued/{stem}.png'
    except Exception:
        # Logged rather than printed: these run inside a request, and a
        # swallowed traceback here is why broken certificates looked like
        # "not earned yet" instead of an error.
        logger.exception(
            'certificate rendering failed for %s / %s',
            getattr(certificate, 'certificate_id', '?'), getattr(career_path, 'name', '?'),
        )
        return None
