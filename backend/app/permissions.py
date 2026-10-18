"""One display-rights gate for public views and discovery."""
from datetime import datetime, timezone
from sqlalchemy import or_
from .models import SourcePermission


def display_conditions():
    return (
        SourcePermission.public_metadata_allowed.is_(True),
        SourcePermission.status.in_(['approved', 'demo']),
        or_(SourcePermission.expires_at.is_(None), SourcePermission.expires_at > datetime.now(timezone.utc)),
    )


def can_display(permission):
    if permission is None or not permission.public_metadata_allowed or permission.status not in ('approved', 'demo'):
        return False
    expiry = permission.expires_at
    if expiry is None:
        return True
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    return expiry > datetime.now(timezone.utc)
