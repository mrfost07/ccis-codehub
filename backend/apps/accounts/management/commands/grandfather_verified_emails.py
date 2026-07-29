"""
Mark existing accounts as email-verified.

Run this ONCE before turning REQUIRE_EMAIL_VERIFICATION back on.

Verification was disabled while @ssct.edu.ph was undeliverable, so every
account created in that window has email_verified=False. Enabling the flag
without this would 403 all of them at login — including the admin — with no
way back in, because the "resend link" path also requires working mail.

Defaults to a dry run; pass --commit to actually write.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import User


class Command(BaseCommand):
    help = 'Mark pre-existing accounts as email-verified before enabling enforcement.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--commit', action='store_true',
            help='Actually apply the change (without this, only reports what would happen).',
        )
        parser.add_argument(
            '--since',
            help='Only accounts created BEFORE this ISO date, e.g. 2026-07-29. '
                 'Use it to grandfather existing users while still requiring '
                 'verification from everyone who signs up afterwards.',
        )

    def handle(self, *args, **options):
        qs = User.objects.filter(email_verified=False)

        if options['since']:
            cutoff = timezone.datetime.fromisoformat(options['since'])
            if timezone.is_naive(cutoff):
                cutoff = timezone.make_aware(cutoff)
            # This model uses created_at; it does not have Django's date_joined.
            qs = qs.filter(created_at__lt=cutoff)
            self.stdout.write(f'Restricting to accounts created before {cutoff.isoformat()}')

        total = qs.count()
        if not total:
            self.stdout.write(self.style.SUCCESS('Nothing to do — no unverified accounts.'))
            return

        self.stdout.write(f'{total} unverified account(s):')
        for u in qs.order_by('created_at')[:20]:
            flag = ' [staff]' if u.is_staff else ''
            self.stdout.write(f'  {u.email}  joined {u.created_at:%Y-%m-%d}{flag}')
        if total > 20:
            self.stdout.write(f'  ... and {total - 20} more')

        if not options['commit']:
            self.stdout.write(self.style.WARNING(
                '\nDry run — nothing changed. Re-run with --commit to apply.'
            ))
            return

        updated = qs.update(email_verified=True, email_verified_at=timezone.now())
        self.stdout.write(self.style.SUCCESS(f'\nMarked {updated} account(s) verified.'))
        self.stdout.write(
            'Now set REQUIRE_EMAIL_VERIFICATION=True in backend/.env and '
            'restart: systemctl restart ccis-backend'
        )
