"""
Handing the student the certificate that was actually rendered.

The renderer writes a PNG and a PDF carrying the SNSU and CCIS seals, the
instructor's name and the CEO's signature. The certificates page drew its own
HTML lookalike and printed that instead, so what students received had none of
those marks. The page now downloads through this endpoint, which makes the
endpoint the thing that must be right: the correct file, in the format asked
for, and not a 404 on a document somebody earned.
"""
import os
import shutil
import tempfile

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.learning.models import CareerPath, Certificate, Enrollment
from apps.learning.utils import certificate_generator as gen

MEDIA = tempfile.mkdtemp(prefix='cert-download-')


@override_settings(MEDIA_ROOT=MEDIA)
class CertificateDownload(TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.student = User.objects.create_user(
            username='dl_stu', email='dl@ssct.edu.ph', password='x',
            role='student', first_name='Mark', last_name='Fostanes',
        )
        self.path = CareerPath.objects.create(
            name='Hosting a Website on AWS EC2', slug='aws-dl', description='d',
            program_type='bscs', difficulty_level='beginner',
            estimated_duration=6, approval_status='approved',
        )
        enrolment = Enrollment.objects.create(
            user=self.student, career_path=self.path, status='completed',
        )
        self.certificate = Certificate.objects.create(
            user=self.student, career_path=self.path, enrollment=enrolment,
            certificate_id='CCIS-2026-DOWNLOAD01', issued_at=timezone.now(),
        )
        self.client = APIClient()
        self.client.force_authenticate(self.student)

    def url(self, query=''):
        return f'/api/learning/certificates/{self.certificate.id}/download/{query}'

    def render(self):
        self.certificate.pdf_url = gen.generate_certificate_pdf(
            self.certificate, self.path)
        self.certificate.save(update_fields=['pdf_url'])

    def fetch(self, query=''):
        """GET the endpoint, then release the file.

        FileResponse keeps its handle open until closed, and on Windows a later
        test in this class cannot then delete the file it is holding.
        """
        response = self.client.get(self.url(query))
        response.body = b''
        if response.status_code == 200:
            response.body = b''.join(response.streaming_content)
            response.close()
        return response

    def disk_path(self, extension='png'):
        relative = self.certificate.pdf_url.lstrip('/')[len('media/'):]
        return os.path.splitext(os.path.join(MEDIA, relative))[0] + '.' + extension

    # -- formats -----------------------------------------------------------

    def test_serves_the_rendered_png_by_default(self):
        self.render()

        response = self.fetch()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertTrue(response.body.startswith(b'\x89PNG'))

    def test_format_pdf_serves_the_pdf_beside_it(self):
        # The page offers "PDF" because that is what a student prints and hands
        # over. Serving the PNG under a .pdf name would not open.
        self.render()

        response = self.fetch('?as=pdf')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.body.startswith(b'%PDF'))
        self.assertIn('.pdf"', response['Content-Disposition'])

    def test_the_filename_names_the_path_and_the_certificate(self):
        self.render()

        disposition = self.fetch()['Content-Disposition']

        self.assertIn('Hosting_a_Website_on_AWS_EC2', disposition)
        self.assertIn('CCIS-2026-DOWNLOAD01', disposition)
        self.assertIn('.png"', disposition)

    def test_falls_back_to_the_image_when_only_a_png_was_ever_written(self):
        # Certificates issued before the PDF was written alongside. A 404 on a
        # document they earned is worse than the image.
        self.render()
        os.remove(self.disk_path('pdf'))

        response = self.fetch('?as=pdf')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'image/png')

    # -- recovery ----------------------------------------------------------

    def test_regenerates_when_the_file_is_gone(self):
        # Media has been lost and restored once already.
        self.render()
        os.remove(self.disk_path())

        response = self.fetch()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.body.startswith(b'\x89PNG'))

    def test_says_so_when_it_was_never_rendered(self):
        response = self.fetch()

        self.assertEqual(response.status_code, 404)
        self.assertIn('error', response.json())

    # -- access ------------------------------------------------------------

    def test_somebody_elses_certificate_is_not_downloadable(self):
        self.render()
        other = User.objects.create_user(
            username='dl_other', email='other@ssct.edu.ph', password='x',
            role='student',
        )
        self.client.force_authenticate(other)

        self.assertEqual(self.fetch().status_code, 404)
