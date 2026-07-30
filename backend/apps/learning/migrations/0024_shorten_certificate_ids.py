"""
Replace certificate references that leaked a user UUID.

Certificates issued by the auto-award path carried
`CERT-{user.id}-{path.id[:8]}` - 53 characters including the holder's FULL user
UUID, printed onto a document students share publicly. Certificates issued by
the claim endpoint carried a different, shorter format, so the reference on a
certificate depended on which code path created it.

Both are rewritten to `CCIS-{year}-{10 hex}`, derived from a digest of
(user, path) rather than from the identifiers themselves. The year comes from
each certificate's own issued_at so historical references stay accurate.

pdf_url is cleared at the same time. Rendered filenames derive from the
reference, so an old file no longer matches its certificate; clearing the field
makes the next request re-render under the correct name. The download endpoint
already regenerates when the file is missing, and `manage.py
rerender_certificates` does the whole set in one pass.

Reversible in shape but not in value: the reverse leaves references untouched,
because the original strings are not recoverable from the digest.
"""
import hashlib

from django.db import migrations


def shorten(apps, schema_editor):
    Certificate = apps.get_model('learning', 'Certificate')

    updated = []
    for certificate in Certificate.objects.all().iterator():
        digest = hashlib.sha256(
            f'{certificate.user_id}:{certificate.career_path_id}'.encode()
        ).hexdigest()
        year = certificate.issued_at.year if certificate.issued_at else 2026
        reference = f'CCIS-{year}-{digest[:10].upper()}'

        if certificate.certificate_id != reference:
            certificate.certificate_id = reference
            certificate.pdf_url = ''
            updated.append(certificate)

    if updated:
        Certificate.objects.bulk_update(updated, ['certificate_id', 'pdf_url'])


class Migration(migrations.Migration):

    dependencies = [
        ('learning', '0023_careerpath_certificate_title'),
    ]

    operations = [
        migrations.RunPython(shorten, migrations.RunPython.noop),
    ]
