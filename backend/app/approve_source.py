"""Rights attestation CLI: does NOT itself confer any copyright licence."""
import argparse
from datetime import datetime, timezone
from sqlalchemy import select, update
from .db import SessionLocal
from .models import Article, AuditLog, Source, SourcePermission

def main():
    parser = argparse.ArgumentParser(description='Review source metadata rights; use ONLY after verifying publishing rights.')
    parser.add_argument('--domain', required=True, help='Exact registered source domain, e.g. samplepublisher.com')
    parser.add_argument('--basis', required=True, help='Document a real approved licence or applicable lawful basis')
    parser.add_argument('--confirm-rights', action='store_true', help='Confirm you verified metadata display rights')
    parser.add_argument('--actor', required=True, help='Reviewer identity for the audit record')
    parser.add_argument('--expires-at', help='Optional rights expiry as an ISO 8601 timestamp with timezone')
    args = parser.parse_args()
    expiry = None
    if args.expires_at:
        try:
            expiry = datetime.fromisoformat(args.expires_at.replace('Z', '+00:00'))
            if expiry.tzinfo is None or expiry <= datetime.now(timezone.utc):
                raise ValueError('Expiry must be a future timestamp with timezone')
        except ValueError as exc:
            parser.error(str(exc))
    if not args.confirm_rights or len(args.basis.strip()) < 12 or not args.actor.strip() or len(args.actor) > 180:
        parser.error('Provide a documented basis (12+ chars) AND --confirm-rights')
    with SessionLocal() as db:
        source = db.scalar(select(Source).where(Source.domain == args.domain.lower().strip()))
        if not source or not source.permission:
            parser.error('No matching source; ingest or add it to registry first')
        if source.source_type == 'demo':
            parser.error('Demo source is already authorized for its original fixtures')
        permission = source.permission
        permission.status = 'approved'
        permission.public_metadata_allowed = True
        permission.ai_processing_allowed = False  # NEVER auto-authorize AI processing.
        permission.rights_basis = args.basis.strip()
        permission.reviewed_at = datetime.now(timezone.utc)
        permission.expires_at = expiry
        db.execute(update(Article).where(Article.source_id == source.id, Article.origin == 'gdelt', Article.status == 'pending_review').values(status='published'))
        db.add(AuditLog(actor=args.actor.strip(), action='approve-source', target=source.domain, reason=args.basis.strip() + (f' | expires={expiry.isoformat()}' if expiry else ' | no expiry recorded')))
        db.commit()
        print(f'Metadata display enabled for {source.domain}; AI use remains disabled.')

if __name__ == '__main__':
    main()
