"""Local customer accounts; no email/SMS verification or owner privilege is conferred."""
from datetime import timedelta
import hashlib
import hmac
import re
import secrets
from uuid import uuid4
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .models import ReaderAccount, ReaderSession
from .owner_access import check_origin, digest, now
from .security import TokenBuckets
from .settings import OWNER_EMAIL

router = APIRouter(prefix='/api/v1/account', tags=['customer accounts'])
attempts = TokenBuckets(capacity=12, period=900)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    derived = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1, dklen=32).hex()
    return f'scrypt${salt}${derived}'


def verify_password(password, encoded):
    try:
        _, salt, _ = encoded.split('$')
        return hmac.compare_digest(hash_password(password, salt), encoded)
    except (ValueError, TypeError):
        return False


DUMMY_HASH = hash_password('unused-dummy-verification-value')


class Credentials(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator('email')
    @classmethod
    def valid_email(cls, value):
        value = value.strip().lower()
        if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', value):
            raise ValueError('Enter a valid email address')
        return value


class Registration(Credentials):
    mobile: str = Field(min_length=8, max_length=32)

    @field_validator('mobile')
    @classmethod
    def valid_mobile(cls, value):
        value = re.sub(r'[\s()-]', '', value)
        if not re.fullmatch(r'\+[1-9][0-9]{7,14}', value):
            raise ValueError('Include country code, for example +91 followed by your number')
        return value


def guard(request, origin):
    check_origin(origin)
    allowed, retry = attempts.allow(request.client.host if request.client else 'unknown')
    if not allowed:
        raise HTTPException(429, 'Too many attempts. Please try later.', headers={'Retry-After': str(retry)})


def issue_session(db, account):
    token = secrets.token_urlsafe(32)
    expiry = now() + timedelta(hours=12)
    db.execute(delete(ReaderSession).where(ReaderSession.expires_at <= now()))
    db.add(ReaderSession(token_hash=digest(token), account_id=account.id, expires_at=expiry))
    db.commit()
    return {'session_token': token, 'expires_in': 43200}


@router.post('/signup')
def signup(payload: Registration, request: Request, origin: str | None = Header(None), db: Session = Depends(get_db)):
    guard(request, origin)
    if payload.email == OWNER_EMAIL:
        raise HTTPException(409, 'Use your existing account sign-in.')
    account = ReaderAccount(id=uuid4().hex, email=payload.email, mobile=payload.mobile, password_hash=hash_password(payload.password))
    db.add(account)
    try:
        db.flush()
        return issue_session(db, account)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Unable to create an account with these details. Try signing in.')


@router.post('/signin')
def signin(payload: Credentials, request: Request, origin: str | None = Header(None), db: Session = Depends(get_db)):
    guard(request, origin)
    account = db.scalar(select(ReaderAccount).where(ReaderAccount.email == payload.email))
    valid = verify_password(payload.password, account.password_hash if account else DUMMY_HASH)
    if not account or not valid:
        raise HTTPException(401, 'Email or password is incorrect.')
    return issue_session(db, account)


def authenticated_reader(authorization: str | None = Header(None), db: Session = Depends(get_db)):
    token = authorization[7:] if authorization and authorization.startswith('Bearer ') else ''
    if not 40 <= len(token) <= 128:
        raise HTTPException(401, 'Sign in to continue.')
    session = db.scalar(select(ReaderSession).where(ReaderSession.token_hash == digest(token), ReaderSession.expires_at > now()))
    if not session:
        raise HTTPException(401, 'Sign in to continue.')
    return session


@router.get('/me')
def profile(session=Depends(authenticated_reader), db: Session = Depends(get_db)):
    account = db.get(ReaderAccount, session.account_id)
    return {'email': account.email, 'mobile': account.mobile, 'role': 'reader'}


@router.post('/logout')
def logout(origin: str | None = Header(None), session=Depends(authenticated_reader), db: Session = Depends(get_db)):
    check_origin(origin)
    db.delete(session); db.commit()
    return {'signed_out': True}
