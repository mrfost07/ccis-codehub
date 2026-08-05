#!/usr/bin/env bash
#
# Snapshot backend/media.
#
# These are user uploads: profile pictures, project files, certificates, the CEO
# signature. Django writes them to disk and nothing else has a copy. They were
# lost once already, when the old VPS was decommissioned, and had to be rebuilt
# by hand.
#
# Read this before trusting it: a local archive does NOT protect against the
# failure that actually happened. The box died and took the disk with it. Local
# rotation covers accidental deletion, a bad deploy, and an app bug that
# overwrites a file — the everyday cases. Surviving host loss needs the copy off
# the host, which is what BACKUP_REMOTE is for. Set it and this script pushes
# every archive there too. Leave it unset and you have the everyday cases only.
#
# The database is Neon and has its own history, so it is deliberately not here.
#
# Install:
#     sudo cp deploy/backup-media.sh /usr/local/bin/ccis-backup
#     sudo chmod +x /usr/local/bin/ccis-backup
#     sudo cp deploy/ccis-backup.service deploy/ccis-backup.timer /etc/systemd/system/
#     sudo systemctl daemon-reload && sudo systemctl enable --now ccis-backup.timer
#
# Run once by hand:  sudo /usr/local/bin/ccis-backup
# Check the timer:   systemctl list-timers ccis-backup.timer

set -euo pipefail

MEDIA_DIR="${MEDIA_DIR:-/home/deploy/CCIS-CodeHub/backend/media}"
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups/media}"
KEEP="${KEEP:-14}"
# Optional off-box destination, e.g. s3://ccis-codehub-backups/media.
# Requires the aws CLI and an instance role or credentials.
BACKUP_REMOTE="${BACKUP_REMOTE:-}"

log() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

if [[ ! -d "$MEDIA_DIR" ]]; then
    log "ERROR: $MEDIA_DIR does not exist; nothing to back up"
    exit 1
fi

# An empty media directory is far more likely to mean a broken deploy or a wrong
# path than a real state worth archiving. Refuse rather than rotate 14 good
# archives out and replace them with empty ones.
file_count="$(find "$MEDIA_DIR" -type f | wc -l)"
if [[ "$file_count" -eq 0 ]]; then
    log "ERROR: $MEDIA_DIR holds no files; refusing to archive nothing"
    exit 1
fi

mkdir -p "$BACKUP_DIR"
stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
archive="$BACKUP_DIR/media-$stamp.tar.gz"

log "archiving $file_count files from $MEDIA_DIR"
# -C so paths inside the archive are relative to media/, which makes a restore a
# plain tar -x into the media directory rather than a path-surgery exercise.
tar -czf "$archive" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"

# Verify before rotating anything. A truncated archive that replaces a good one
# is worse than a failed backup, because it looks like success.
if ! tar -tzf "$archive" >/dev/null 2>&1; then
    log "ERROR: $archive did not read back; removing it and keeping the old ones"
    rm -f "$archive"
    exit 1
fi

archived_count="$(tar -tzf "$archive" | grep -vc '/$' || true)"
if [[ "$archived_count" -lt "$file_count" ]]; then
    log "ERROR: archive holds $archived_count files but media has $file_count; removing"
    rm -f "$archive"
    exit 1
fi

log "wrote $archive ($(du -h "$archive" | cut -f1), $archived_count files)"

if [[ -n "$BACKUP_REMOTE" ]]; then
    if command -v aws >/dev/null 2>&1; then
        log "copying to $BACKUP_REMOTE"
        aws s3 cp "$archive" "$BACKUP_REMOTE/" --only-show-errors
        log "off-box copy done"
    else
        log "WARNING: BACKUP_REMOTE is set but the aws CLI is missing; archive is local only"
    fi
else
    log "NOTE: BACKUP_REMOTE unset — this archive lives on the same disk as the data"
fi

# Rotate only after a verified new archive exists.
mapfile -t stale < <(ls -1t "$BACKUP_DIR"/media-*.tar.gz 2>/dev/null | tail -n "+$((KEEP + 1))")
for old in "${stale[@]:-}"; do
    [[ -n "$old" ]] || continue
    log "pruning $old"
    rm -f "$old"
done

log "done; $(ls -1 "$BACKUP_DIR"/media-*.tar.gz 2>/dev/null | wc -l) archives kept"
