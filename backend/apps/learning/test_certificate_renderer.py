"""
Tests for the completion-certificate renderer.

The old renderer failed in ways nobody would notice until a student complained:
it opened CareerPath.certificate_template as a background, so a .pdf upload
(which the modal accepted) raised inside a bare `except Exception` and returned
None - producing no certificate and no error. It also drew text at hardcoded
48/64/32px with no fitting, so a long name simply ran off the edge.

So these tests check the things that silently broke: that a file is actually
produced, that overlong text is shrunk rather than clipped, that a missing asset
degrades instead of crashing, and that regenerating does not litter the media
directory with orphans.
"""
import os
import shutil
import tempfile

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.learning.models import CareerPath, Certificate, Enrollment
from apps.learning.utils import certificate_generator as gen

MEDIA = tempfile.mkdtemp(prefix='cert-test-')


@override_settings(MEDIA_ROOT=MEDIA)
class CertificateRendering(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.instructor = User.objects.create_user(
            username='cert_ins', email='ins@ssct.edu.ph', password='x',
            role='instructor', first_name='Renier', last_name='Fostanes',
        )
        self.student = User.objects.create_user(
            username='cert_stu', email='stu@ssct.edu.ph', password='x',
            role='student', first_name='Kimberly', last_name='Atuel',
        )
        self.path = CareerPath.objects.create(
            name='Data Science and Machine Learning', slug='dsml-cert',
            description='d', program_type='bscs', difficulty_level='intermediate',
            estimated_duration=8, instructor=self.instructor,
            approval_status='approved',
        )

    def make_certificate(self, **kwargs):
        enrolment = Enrollment.objects.create(
            user=kwargs.pop('user', self.student), career_path=self.path,
            status='completed',
        )
        return Certificate.objects.create(
            user=enrolment.user, career_path=self.path, enrollment=enrolment,
            certificate_id=kwargs.pop('certificate_id', 'CCIS-2026-TEST-0001'),
            issued_at=timezone.now(), **kwargs,
        )

    # -- output ------------------------------------------------------------

    def test_writes_a_png_and_a_pdf_and_returns_the_png_url(self):
        certificate = self.make_certificate()
        url = gen.generate_certificate_pdf(certificate, self.path)

        self.assertIsNotNone(url, 'renderer returned None - check the logged traceback')
        self.assertTrue(url.startswith('/media/certificates/issued/'), url)
        self.assertTrue(url.endswith('.png'), url)

        png = os.path.join(MEDIA, url.replace('/media/', '', 1))
        self.assertTrue(os.path.exists(png), f'no file at {png}')
        self.assertGreater(os.path.getsize(png), 20_000, 'suspiciously small image')
        self.assertTrue(os.path.exists(png[:-4] + '.pdf'), 'no PDF written alongside')

    def test_regenerating_replaces_the_file_instead_of_orphaning_it(self):
        # The previous version appended uuid4 to every filename, so each call to
        # the claim endpoint left another copy behind forever.
        certificate = self.make_certificate(certificate_id='CCIS-2026-ORPHAN-01')
        issued = os.path.join(MEDIA, 'certificates', 'issued')

        gen.generate_certificate_pdf(certificate, self.path)
        gen.generate_certificate_pdf(certificate, self.path)
        gen.generate_certificate_pdf(certificate, self.path)

        # Scoped to this certificate: MEDIA is shared by every test in the class,
        # so counting the whole directory picks up other tests' output.
        mine = [f for f in os.listdir(issued) if f.startswith('cert_CCIS-2026-ORPHAN-01')]
        self.assertEqual(
            sorted(mine),
            ['cert_CCIS-2026-ORPHAN-01.pdf', 'cert_CCIS-2026-ORPHAN-01.png'],
            f'three renders left {mine}',
        )

    def test_rendered_image_has_the_expected_canvas_size(self):
        image = gen.render_certificate(self.make_certificate(), self.path)
        self.assertEqual(image.size, (gen.WIDTH, gen.HEIGHT))

    def test_the_certificate_is_not_blank(self):
        image = gen.render_certificate(self.make_certificate(), self.path)
        colours = {c for _count, c in image.convert('RGB').getcolors(maxcolors=100_000)}
        self.assertGreater(
            len(colours), 50,
            'only a handful of distinct colours - nothing was drawn',
        )

    # -- the failures that used to be silent -------------------------------

    def test_a_very_long_name_is_shrunk_to_fit_rather_than_clipped(self):
        from PIL import ImageDraw

        long_student = User.objects.create_user(
            username='cert_long', email='long@ssct.edu.ph', password='x',
            role='student', first_name='Maria Kristina Josefina',
            last_name='Dela Cruz-Villanueva',
        )
        certificate = self.make_certificate(
            user=long_student, certificate_id='CCIS-2026-TEST-0002',
        )
        image = gen.render_certificate(certificate, self.path)
        draw = ImageDraw.Draw(image)

        name = 'MARIA KRISTINA JOSEFINA DELA CRUZ-VILLANUEVA'
        fitted = gen.Fonts().fit(draw, name, 'serif', gen.WIDTH - 500, 96)
        self.assertLessEqual(
            draw.textlength(name, font=fitted), gen.WIDTH - 500,
            'the name still overflows its allotted width',
        )

    def test_a_missing_asset_degrades_instead_of_crashing(self):
        missing = os.path.join(gen.ASSET_DIR, 'definitely-not-here.png')
        image = gen.render_certificate(self.make_certificate(), self.path)
        # _paste_contained returns 0 for an absent file and logs a warning.
        self.assertEqual(gen._paste_contained(image, missing, 100, 100, 50), 0)

    def test_a_pdf_template_upload_can_no_longer_break_generation(self):
        # This is the exact production state that produced nothing: a path whose
        # certificate_template is a PDF. The field is now ignored entirely.
        self.path.certificate_template = 'certificates/templates/Software_Engineering.pdf'
        self.path.save(update_fields=['certificate_template'])

        url = gen.generate_certificate_pdf(
            self.make_certificate(certificate_id='CCIS-2026-TEST-0003'), self.path,
        )
        self.assertIsNotNone(url, 'a PDF in certificate_template still breaks rendering')

    # -- the editable field ------------------------------------------------

    def test_a_blank_title_falls_back_to_certificate_of_completion(self):
        self.assertEqual(self.path.certificate_title, '')
        image = gen.render_certificate(self.make_certificate(), self.path)
        self.assertIsNotNone(image)   # rendered without a title configured

    def test_a_custom_title_is_used(self):
        # One certificate, rendered twice. Enrollment is unique per
        # (user, career_path), so a second make_certificate() for the same
        # student would raise IntegrityError rather than test anything.
        certificate = self.make_certificate()

        self.path.certificate_title = ''
        default = gen.render_certificate(certificate, self.path)

        self.path.certificate_title = 'Certificate of Achievement'
        custom = gen.render_certificate(certificate, self.path)

        self.assertNotEqual(
            default.tobytes(), custom.tobytes(),
            'changing certificate_title did not change the rendered image',
        )

    def test_the_instructor_name_comes_from_the_path(self):
        self.assertEqual(gen._instructor_name(self.path), 'Renier Fostanes')

    def test_a_path_without_an_instructor_still_renders(self):
        self.path.instructor = None
        self.path.save(update_fields=['instructor'])
        self.assertEqual(gen._instructor_name(self.path), 'CCIS-CodeHub Faculty')
        self.assertIsNotNone(gen.render_certificate(self.make_certificate(), self.path))

    # -- fonts -------------------------------------------------------------

    def test_font_fallback_is_scalable_not_an_eleven_pixel_bitmap(self):
        # The old code ended at ImageFont.load_default() with no size, which is
        # an 11px bitmap. On a server without DejaVu every certificate rendered
        # with microscopic text at 64px positions.
        from PIL import Image, ImageDraw

        fonts = gen.Fonts()
        fonts.serif = None
        fonts.sans = None
        draw = ImageDraw.Draw(Image.new('RGB', (100, 100)))

        small = draw.textlength('Fostanes', font=fonts.load('serif', 20))
        large = draw.textlength('Fostanes', font=fonts.load('serif', 80))
        self.assertGreater(
            large, small * 2,
            'the fallback font does not scale, so text would render tiny',
        )
