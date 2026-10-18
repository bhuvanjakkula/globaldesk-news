"""Passwordless owner tokens. Issuance requires trusted server/database access."""
import argparse
import os
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session
from .db import SessionLocal, get_db
from .models import Article, AuditLog, OwnerCredential, Source
from .settings import OWNER_EMAIL, OWNER_SITE_ORIGIN, OWNER_ALLOWED_ORIGINS

router=APIRouter(prefix='/api/v1/owner',tags=['private owner access'])
LINK_MINUTES=10
SESSION_HOURS=12

def digest(token): return sha256(token.encode()).hexdigest()
def now(): return datetime.now(timezone.utc)
def as_utc(value): return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

def issue_link(db):
    token=secrets.token_urlsafe(32); issued=now()
    # Issuing a new link invalidates prior unused links; existing sessions stay valid.
    db.execute(delete(OwnerCredential).where((OwnerCredential.kind=='link') | (OwnerCredential.expires_at<=issued)))
    db.add(OwnerCredential(token_hash=digest(token),kind='link',email=OWNER_EMAIL,expires_at=issued+timedelta(minutes=LINK_MINUTES)))
    db.add(AuditLog(actor=OWNER_EMAIL,action='owner-link-issued',target='owner-access',reason='Trusted local operator generated a single-use passwordless sign-in link.'))
    db.commit()
    return f'{OWNER_SITE_ORIGIN}/owner#token={token}'

def check_origin(origin):
    if origin not in OWNER_ALLOWED_ORIGINS: raise HTTPException(403,'Untrusted request origin')

class Claim(BaseModel):
    token: str = Field(min_length=40,max_length=128,pattern=r'^[A-Za-z0-9_-]+$')

@router.post('/redeem')
def redeem(claim: Claim, origin: str | None=Header(None), db: Session=Depends(get_db)):
    check_origin(origin); issued=now()
    # Atomic conditional update prevents reuse even across workers/parallel requests.
    changed=db.execute(update(OwnerCredential).where(OwnerCredential.token_hash==digest(claim.token),
        OwnerCredential.kind=='link',OwnerCredential.email==OWNER_EMAIL,
        OwnerCredential.consumed_at.is_(None),OwnerCredential.expires_at>issued).values(consumed_at=issued))
    if changed.rowcount!=1:
        db.rollback();raise HTTPException(401,'Sign-in link is invalid, expired or already used')
    session=secrets.token_urlsafe(32)
    db.add(OwnerCredential(token_hash=digest(session),kind='session',email=OWNER_EMAIL,expires_at=issued+timedelta(hours=SESSION_HOURS)))
    db.add(AuditLog(actor=OWNER_EMAIL,action='owner-signed-in',target='owner-access',reason='Single-use trusted-server sign-in link redeemed.'))
    db.commit()
    # This endpoint is called by the website server; it never returns credentials in a URL.
    return {'session_token':session,'expires_in':SESSION_HOURS*3600}

def authenticated_owner(authorization: str | None=Header(None), db: Session=Depends(get_db)):
    token=authorization.removeprefix('Bearer ') if authorization and authorization.startswith('Bearer ') else ''
    if not 40<=len(token)<=128: raise HTTPException(401,'Owner sign-in required')
    row=db.scalar(select(OwnerCredential).where(OwnerCredential.token_hash==digest(token),
        OwnerCredential.kind=='session',OwnerCredential.email==OWNER_EMAIL,
        OwnerCredential.consumed_at.is_(None),OwnerCredential.expires_at>now()))
    if row is None: raise HTTPException(401,'Owner sign-in required')
    return row

@router.get('/me')
def owner_me(owner=Depends(authenticated_owner),db: Session=Depends(get_db)):
    return {'email':owner.email,'role':'owner','access':'all implemented features','payment_required':False,
        'price':0,'expires_at':as_utc(owner.expires_at),'stats':{
            'articles':db.scalar(select(func.count()).select_from(Article)),
            'sources':db.scalar(select(func.count()).select_from(Source))},
        'recent_activity':[{'action':a.action,'created_at':as_utc(a.created_at),'target':a.target} for a in db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(8))]}

@router.post('/logout')
def logout(origin: str | None=Header(None),owner=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin)
    owner.consumed_at=now()
    db.add(AuditLog(actor=owner.email,action='owner-signed-out',target='owner-access',reason='Owner revoked the current browser session.'))
    db.commit()
    return {'signed_out':True}

def main():
    parser=argparse.ArgumentParser(description='Trusted local passwordless owner access; no email provider or payment service')
    parser.add_argument('action',choices=['issue','revoke-all'])
    parser.add_argument('--output',help='Write the private sign-in link to a new file instead of stdout')
    args=parser.parse_args()
    with SessionLocal() as db:
        if args.action=='revoke-all':
            db.execute(delete(OwnerCredential))
            db.add(AuditLog(actor=OWNER_EMAIL,action='owner-access-revoked',target='owner-access',reason='Trusted local operator revoked all owner sessions and sign-in links.'))
            db.commit();print('All owner links and sessions revoked.');return
        link=issue_link(db)
        if args.output:
            path=Path(args.output)
            descriptor=os.open(str(path),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(descriptor,'w',encoding='utf-8') as stream:stream.write(link)
            print('Private owner sign-in link written. Expires in 10 minutes; use once.')
        else:print(link)

if __name__=='__main__':main()
