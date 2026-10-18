"""Private operator CLI. Access is controlled by host/database permissions."""
import argparse
import json
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import Article, AuditLog, Source


def moderate(db: Session, action: str, target: str, actor: str, reason: str):
    if action not in ('withdraw', 'block-source'):
        raise ValueError('Unknown editorial action')
    if not actor.strip() or len(actor) > 180 or len(reason.strip()) < 12:
        raise ValueError('Provide an actor and a meaningful reason (12+ characters)')
    if action == 'withdraw':
        article = db.scalar(select(Article).where(Article.slug == target))
        if article is None:
            raise ValueError('Article not found')
        article.status = 'withdrawn'
    else:
        source = db.scalar(select(Source).where(Source.domain == target))
        if source is None or source.permission is None:
            raise ValueError('Source not found')
        source.permission.status = 'blocked'
        source.permission.public_metadata_allowed = False
        source.permission.ai_processing_allowed = False
    db.add(AuditLog(actor=actor.strip(), action=action, target=target, reason=reason.strip()))
    db.commit()


def main():
    parser = argparse.ArgumentParser(description='Private editorial controls and audit history')
    parser.add_argument('action', choices=['withdraw', 'block-source', 'audit'])
    parser.add_argument('--target', help='Article slug or exact source domain')
    parser.add_argument('--actor', help='Operator identity for the audit record')
    parser.add_argument('--reason', help='Document the editorial decision')
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.action == 'audit':
            rows = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(100))
            print(json.dumps([{'id': r.id, 'actor': r.actor, 'action': r.action, 'target': r.target,
                               'reason': r.reason, 'created_at': r.created_at.isoformat()} for r in rows], indent=2))
        else:
            if not all([args.target, args.actor, args.reason]):
                parser.error('--target, --actor and --reason are required')
            try:
                moderate(db, args.action, args.target, args.actor, args.reason)
            except ValueError as exc:
                parser.error(str(exc))
            print('Editorial action saved and audited.')


if __name__ == '__main__':
    main()
