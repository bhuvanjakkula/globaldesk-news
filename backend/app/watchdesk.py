"""Private, explainable topic monitors. No inferred truth or automatic delivery."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import re
import unicodedata
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .models import Article, AuditLog, Category, OwnerWatch, Source, SourcePermission, WatchReview
from .owner_access import authenticated_owner, check_origin, as_utc
from .schemas import ArticleOut
from .permissions import display_conditions

router=APIRouter(prefix='/api/v1/owner/watch',tags=['private watch desk'])
SAMPLE_LIMIT=600

def words(value):return re.findall(r'[^\W_]+',unicodedata.normalize('NFKC',value).casefold(),re.UNICODE)
def phrase_in(phrase,tokens):
    needle=words(phrase)
    return bool(needle) and any(tokens[i:i+len(needle)]==needle for i in range(len(tokens)-len(needle)+1))

def evidence(article,watch):
    if watch.category and article.category.slug!=watch.category:return None
    title=words(article.title);description=words(article.summary or '')
    if any(phrase_in(term,title) or phrase_in(term,description) for term in watch.exclude):return None
    matched=[]
    for phrase in watch.keywords:
        locations=[name for name,tokens in [('headline',title),('description',description)] if phrase_in(phrase,tokens)]
        if locations:matched.append({'phrase':phrase,'fields':locations})
    if not matched or (watch.match_mode=='all' and len(matched)!=len(watch.keywords)):return None
    return matched

def content_hash(article):
    data={'title':article.title,'summary':article.summary,'url':article.url,'source':article.source.domain,'source_name':article.source.name,
          'category':article.category.slug,'country':article.country,'language':article.language,
          'published_at':as_utc(article.published_at).isoformat(),'demo':article.is_demo}
    return sha256(json.dumps(data,sort_keys=True,ensure_ascii=True).encode()).hexdigest()

class WatchInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str | None=Field(None,pattern=r'^[a-f0-9]{32}$')
    name: str=Field(min_length=1,max_length=80)
    keywords: list[str]=Field(min_length=1,max_length=8)
    exclude: list[str]=Field(default_factory=list,max_length=5)
    match_mode: Literal['any','all']='any'
    category: str | None=Field(None,max_length=50)
    hours: Literal[24,72,168,720]=168

    @field_validator('name')
    @classmethod
    def clean_name(cls,value):
        value=value.strip()
        if not value:raise ValueError('Name must not be empty')
        return value

    @field_validator('keywords','exclude')
    @classmethod
    def clean_terms(cls,values):
        result=[]
        for value in values:
            if len(value)>60 or not 1<=len(words(value))<=6:raise ValueError('Each phrase needs 1–6 words and at most 60 characters')
            normalized=' '.join(words(value))
            if normalized not in result:result.append(normalized)
        return result

class WatchTarget(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str=Field(pattern=r'^[a-f0-9]{32}$')

def owned(db,identity,watch_id):
    row=db.scalar(select(OwnerWatch).where(OwnerWatch.id==watch_id,OwnerWatch.owner_email==identity.email).with_for_update())
    if row is None:raise HTTPException(404,'Monitor not found')
    return row

def config(watch):
    return {k:getattr(watch,k) for k in ['id','name','keywords','exclude','match_mode','category','hours']}

def public_sample(db,hours,now):
    rows=db.scalars(select(Article).join(Article.source).join(Source.permission).where(
        Article.status=='published',*display_conditions(),Article.published_at>=now-timedelta(hours=hours*2),
        Article.published_at<=now).options(joinedload(Article.category),joinedload(Article.source))
        .order_by(Article.published_at.desc(),Article.id.desc()).limit(SAMPLE_LIMIT+1)).all()
    return rows[:SAMPLE_LIMIT],len(rows)>SAMPLE_LIMIT

def analyze(watch,rows,reviews,now,truncated=False):
    current=[];previous=[];boundary=now-timedelta(hours=watch.hours)
    oldest=now-timedelta(hours=watch.hours*2)
    for article in rows:
        published=as_utc(article.published_at)
        if not oldest<=published<=now:continue
        reasons=evidence(article,watch)
        if reasons is None:continue
        if published>=boundary:
            fingerprint=content_hash(article)
            current.append({'article':article,'evidence':reasons,'new_or_changed':reviews.get((watch.id,article.id))!=fingerprint})
        else:previous.append(article)
    count=len(current);before=len(previous)
    trend='incomplete sample' if truncated else ('first observed' if count and not before else ('quiet' if not count and not before else ('rising' if count>before else ('falling' if count<before else 'steady'))))
    return {**config(watch),'current_count':count,'previous_count':before,'delta':count-before,
        'change_percent':round((count-before)*100/before) if before and not truncated else None,
        'trend':trend,'unreviewed_count':sum(item['new_or_changed'] for item in current),
        'publisher_domains':len({item['article'].source.domain for item in current}),
        'demo_count':sum(item['article'].is_demo for item in current),
        'items':[{'article':ArticleOut.model_validate(item['article']),'evidence':item['evidence'],
                  'new_or_changed':item['new_or_changed']} for item in current[:8]],
        'display_limit':8,'has_more':count>8},current

@router.get('/report')
def report(identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    now=datetime.now(timezone.utc)
    watches=db.scalars(select(OwnerWatch).where(OwnerWatch.owner_email==identity.email).order_by(OwnerWatch.slot)).all()
    if watches:
        rows,truncated=public_sample(db,max(w.hours for w in watches),now)
        review_rows=db.scalars(select(WatchReview).where(WatchReview.watch_id.in_([w.id for w in watches]),WatchReview.article_id.in_([a.id for a in rows])))
        reviews={(r.watch_id,r.article_id):r.content_hash for r in review_rows}
    else:rows,truncated,reviews=[],False,{}
    return {'generated_at':now,'sample_limit':SAMPLE_LIMIT,'sampled_articles':len(rows),'truncated':truncated,
        'monitor_limit':12,'monitors':[analyze(w,rows,reviews,now,truncated)[0] for w in watches],
        'method':'Exact normalized word/phrase matches in permitted headlines/descriptions. Current and preceding equal-duration windows are compared on publication time. New or changed means no matching stored review fingerprint. Counts describe this sample, not the wider news market. No background notifications or email are sent.'}

@router.post('/save')
def save(payload: WatchInput,origin: str | None=Header(None),identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin)
    if payload.category and not db.scalar(select(Category.id).where(Category.slug==payload.category)):raise HTTPException(422,'Unknown exact section')
    if payload.id:
        watch=owned(db,identity,payload.id)
        db.execute(delete(WatchReview).where(WatchReview.watch_id==watch.id))
        action='watch-updated'
    else:
        used=set(db.scalars(select(OwnerWatch.slot).where(OwnerWatch.owner_email==identity.email)))
        free=next((slot for slot in range(12) if slot not in used),None)
        if free is None:raise HTTPException(409,'Maximum 12 monitors; remove one before adding another')
        watch=OwnerWatch(id=uuid4().hex,owner_email=identity.email,slot=free)
        db.add(watch);action='watch-created'
    for key,value in payload.model_dump(exclude={'id'}).items():setattr(watch,key,value)
    db.add(AuditLog(actor=identity.email,action=action,target=watch.id,reason='Owner saved an exact-match topic monitor.'))
    try:db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,'Monitor changed concurrently; refresh and retry')
    return config(watch)

@router.post('/remove')
def remove(payload: WatchTarget,origin: str | None=Header(None),identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin);watch=owned(db,identity,payload.id)
    db.execute(delete(WatchReview).where(WatchReview.watch_id==watch.id));db.delete(watch)
    db.add(AuditLog(actor=identity.email,action='watch-removed',target=payload.id,reason='Owner removed a private topic monitor.'))
    db.commit();return {'removed':True}

@router.post('/review')
def review(payload: WatchTarget,origin: str | None=Header(None),identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin);watch=owned(db,identity,payload.id);now=datetime.now(timezone.utc)
    rows,truncated=public_sample(db,watch.hours,now)
    _,current=analyze(watch,rows,{},now,truncated)
    for item in current:
        article=item['article'];row=db.get(WatchReview,(watch.id,article.id))
        if row:row.content_hash=content_hash(article);row.reviewed_at=now
        else:db.add(WatchReview(watch_id=watch.id,article_id=article.id,content_hash=content_hash(article),reviewed_at=now))
    db.add(AuditLog(actor=identity.email,action='watch-reviewed',target=watch.id,reason=f'Owner reviewed {len(current)} currently sampled matching listings.'))
    try:db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,'Review changed concurrently; refresh and retry')
    return {'reviewed':len(current),'truncated':truncated}
