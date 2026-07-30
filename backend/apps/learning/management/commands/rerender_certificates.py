"""
Render every issued certificate, or only the ones missing a file.

Needed for two reasons. Certificates issued before the renderer existed have an
empty pdf_url, and migration 0024 cleared pdf_url on every certificate whose
reference it shortened, since rendered filenames derive from that reference.

    python manage.py rerender_certificates            # only the missing ones
    python manage.py rerender_certificates --all      # every certificate
    python manage.py rerender_certificates --dry-run
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Render certificate images for issued certificates.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all', action='store_true',
            help='Re-render every certificate, not just those with no file.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Report what would be rendered and change nothing.',
        )

    def handle(self, *args, **options):
        from apps.learning.models import Certificate
        from apps.learning.utils.certificate_generator import (
            Fonts, generate_certificate_pdf,
        )

        fonts = Fonts()
        if not fonts.serif and not fonts.sans:
            self.stdout.write(self.style.WARNING(
                '  no TrueType font resolved - certificates will use the plain '
                'built-in font. Drop a .ttf into apps/learning/certificate_assets/fonts/ '
                'for a better result.'
            ))

        certificates = Certificate.objects.select_related('career_path', 'user')
        if not options['all']:
            certificates = certificates.filter(pdf_url='')

        total = certificates.count()
        if not total:
            self.stdout.write('nothing to render'
                              + ('' if options['all'] else ' (all certificates have a file)'))
            return

        self.stdout.write(f'{"would render" if options["dry_run"] else "rendering"} {total} certificate(s)')
        rendered = failed = 0

        for certificate in certificates.iterator():
            holder = certificate.user.get_username()
            path_name = certificate.career_path.name if certificate.career_path else '?'

            if options['dry_run']:
                self.stdout.write(f'  - {certificate.certificate_id}  {holder}  {path_name[:38]}')
                continue

            url = generate_certificate_pdf(certificate, certificate.career_path)
            if url:
                certificate.pdf_url = url
                certificate.save(update_fields=['pdf_url'])
                rendered += 1
                self.stdout.write(f'  + {certificate.certificate_id}  {holder}  -> {url}')
            else:
                failed += 1
                self.stdout.write(self.style.ERROR(
                    f'  ! {certificate.certificate_id}  {holder}  failed - see the log'
                ))

        if not options['dry_run']:
            style = self.style.SUCCESS if not failed else self.style.WARNING
            self.stdout.write(style(f'\nrendered {rendered}, failed {failed}'))
