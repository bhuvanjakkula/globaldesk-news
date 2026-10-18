"""Trusted operator attestation for spoken headline reuse; grants no licence itself."""
import argparse
from sqlalchemy import select
from .db import SessionLocal
from .models import Source, AuditLog
from .owner_access import now


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--domain', required=True)
    parser.add_argument('--actor', required=True)
    parser.add_argument('--basis', required=True)
    parser.add_argument('--allow', action='store_true')
    parser.add_argument('--revoke', action='store_true')
    parser.add_argument('--allow-external-ai', action='store_true', help='Explicitly attest rights to send this source text to external AI providers')
    args = parser.parse_args()
    if args.allow_external_ai and not args.allow:
        parser.error('--allow-external-ai requires --allow and a documented basis covering external AI processing')
    if args.allow == args.revoke or len(args.basis.strip()) < 12 or not 1 <= len(args.actor.strip()) <= 180:
        parser.error('Choose --allow or --revoke; provide reviewer identity and a documented basis of 12+ characters')
    with SessionLocal() as db:
        source = db.scalar(select(Source).where(Source.domain == args.domain.strip().lower()))
        if not source or not source.permission:
            parser.error('Registered source permission is required')
        source.permission.narration_allowed = args.allow
        if args.allow_external_ai:
            source.permission.ai_processing_allowed = True
        source.permission.reviewed_at = now()
        db.add(AuditLog(actor=args.actor.strip(), action='narration-allowed' if args.allow else 'narration-revoked',
            target=source.domain, reason=args.basis.strip()+(' | External AI processing explicitly approved.' if args.allow_external_ai else '')))
        db.commit()
        print('Narration permission updated. Publication and expiry gates still apply.')


if __name__ == '__main__':
    main()
