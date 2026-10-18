"""Bounded public comparisons and private versioned research collections."""
from datetime import datetime,timezone
from itertools import combinations
import re
from uuid import uuid4
from fastapi import APIRouter,Depends,Header,HTTPException,Query
from pydantic import BaseModel,ConfigDict,Field,field_validator
from sqlalchemy import delete,select,update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session,joinedload
from .db import get_db
from .intelligence import tokens
from .models import Article,AuditLog,ResearchCollection,Source,SourcePermission
from .owner_access import authenticated_owner,as_utc,check_origin
from .schemas import ArticleOut
from .watchdesk import content_hash
from .permissions import display_conditions

router=APIRouter(tags=['evidence comparison'])
SLUG=re.compile(r'^[A-Za-z0-9_-]{1,180}$')

def validate_slugs(slugs):
    if not 2<=len(slugs)<=4 or len(set(slugs))!=len(slugs) or any(not SLUG.fullmatch(s) for s in slugs):
        raise ValueError('Select 2–4 different valid story identifiers')
    return slugs

def public_rows(db,slugs):
    rows=db.scalars(select(Article).join(Article.source).join(Source.permission).where(
        Article.slug.in_(slugs),Article.status=='published',Article.published_at<=datetime.now(timezone.utc),
        *display_conditions())
        .options(joinedload(Article.source),joinedload(Article.category))).all()
    index={a.slug:a for a in rows}
    return [index[s] for s in slugs if s in index]

def comparison(rows):
    terms={a.slug:set(tokens(a.title)) for a in rows}
    pairs=[]
    for a,b in combinations(rows,2):
        first,second=terms[a.slug],terms[b.slug];union=first|second
        pairs.append({'left':a.slug,'right':b.slug,'shared_terms':sorted(first&second)[:20],
            'left_only_terms':sorted(first-second)[:12],'right_only_terms':sorted(second-first)[:12],
            'headline_overlap_percent':round(len(first&second)*100/len(union)) if union else 0,
            'same_publisher_domain':a.source.domain==b.source.domain})
    all_terms=set.intersection(*(terms[a.slug] for a in rows)) if rows else set()
    earliest=min(as_utc(a.published_at) for a in rows);latest=max(as_utc(a.published_at) for a in rows)
    return {'generated_at':datetime.now(timezone.utc),'articles':[ArticleOut.model_validate(a) for a in rows],
        'pairs':pairs,'shared_across_all':sorted(all_terms)[:20],
        'dimensions':{'publisher_domains':len({a.source.domain for a in rows}),
            'countries':sorted({a.country for a in rows}),'languages':sorted({a.language for a in rows}),
            'sections':sorted({a.category.slug for a in rows}),
            'time_span_hours':round((latest-earliest).total_seconds()/3600,2),
            'demo_articles':sum(a.is_demo for a in rows)},
        'timeline':[a.slug for a in sorted(rows,key=lambda a:(as_utc(a.published_at),a.slug))],
        'method':'Headline overlap is Jaccard similarity of normalized non-stopword headline terms. It does not identify agreement, contradiction, source independence or truth. Negation, numbers and attribution require human reading.'}

@router.get('/api/v1/compare')
def compare(slugs: str=Query(...,max_length=740),db: Session=Depends(get_db)):
    try:identifiers=validate_slugs(slugs.split(','))
    except ValueError as exc:raise HTTPException(422,str(exc))
    rows=public_rows(db,identifiers)
    if len(rows)!=len(identifiers):raise HTTPException(404,'One or more listings are unavailable for public comparison')
    return comparison(rows)

class CollectionInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str | None=Field(None,pattern=r'^[a-f0-9]{32}$')
    version: int | None=Field(None,ge=1,le=1000000000)
    name: str=Field(min_length=1,max_length=80)
    note: str=Field(default='',max_length=1000)
    slugs: list[str]=Field(min_length=2,max_length=4)
    @field_validator('slugs')
    @classmethod
    def valid_slugs(cls,value):return validate_slugs(value)
    @field_validator('name')
    @classmethod
    def valid_name(cls,value):
        value=value.strip()
        if not value:raise ValueError('A name is required')
        return value

class CollectionTarget(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str=Field(pattern=r'^[a-f0-9]{32}$')
    version: int=Field(ge=1,le=1000000000)

@router.post('/api/v1/owner/research/save')
def save(payload: CollectionInput,origin: str | None=Header(None),identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin)
    rows=public_rows(db,payload.slugs)
    if len(rows)!=len(payload.slugs):raise HTTPException(409,'Some selected listings are unavailable. Reopen the comparison before saving.')
    values={'name':payload.name,'note':payload.note,'slugs':payload.slugs,
            'fingerprints':{a.slug:content_hash(a) for a in rows},'updated_at':datetime.now(timezone.utc)}
    if payload.id:
        if payload.version is None:raise HTTPException(422,'Version is required when updating a collection')
        result=db.execute(update(ResearchCollection).where(ResearchCollection.id==payload.id,
            ResearchCollection.owner_email==identity.email,ResearchCollection.version==payload.version)
            .values(**values,version=payload.version+1))
        if result.rowcount!=1:
            db.rollback();raise HTTPException(409,'Collection changed or is unavailable. Refresh before saving.')
        identifier=payload.id;version=payload.version+1;action='research-updated'
    else:
        used=set(db.scalars(select(ResearchCollection.slot).where(ResearchCollection.owner_email==identity.email)))
        slot=next((i for i in range(20) if i not in used),None)
        if slot is None:raise HTTPException(409,'Maximum 20 collections reached')
        identifier=uuid4().hex;version=1;action='research-created'
        db.add(ResearchCollection(id=identifier,owner_email=identity.email,slot=slot,version=version,**values))
    db.add(AuditLog(actor=identity.email,action=action,target=identifier,reason='Owner saved a private research collection and content fingerprints.'))
    try:db.commit()
    except IntegrityError:
        db.rollback();raise HTTPException(409,'Collection changed concurrently. Refresh and retry.')
    return {'id':identifier,'version':version,'saved':True}

@router.get('/api/v1/owner/research')
def collections(identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    records=db.scalars(select(ResearchCollection).where(ResearchCollection.owner_email==identity.email)
                      .order_by(ResearchCollection.updated_at.desc(),ResearchCollection.id)).all()
    all_slugs=list(dict.fromkeys(s for record in records for s in record.slugs))
    visible={a.slug:a for a in public_rows(db,all_slugs)} if all_slugs else {}
    result=[]
    for record in records:
        items=[]
        for slug in record.slugs:
            if slug in visible:
                a=visible[slug]
                items.append({'article':ArticleOut.model_validate(a),'changed_since_saved':record.fingerprints.get(slug)!=content_hash(a)})
        result.append({'id':record.id,'version':record.version,'name':record.name,'note':record.note,
            'slugs':record.slugs,'updated_at':as_utc(record.updated_at),'items':items,
            'unavailable_count':len(record.slugs)-len(items),'changed_count':sum(i['changed_since_saved'] for i in items)})
    return {'limit':20,'collections':result,'retention':'Only identifiers, fingerprints and your own notes are saved. Publisher metadata is reloaded through current publication gates.'}

@router.post('/api/v1/owner/research/remove')
def remove(payload: CollectionTarget,origin: str | None=Header(None),identity=Depends(authenticated_owner),db: Session=Depends(get_db)):
    check_origin(origin)
    result=db.execute(delete(ResearchCollection).where(ResearchCollection.id==payload.id,
        ResearchCollection.owner_email==identity.email,ResearchCollection.version==payload.version))
    if result.rowcount!=1:
        db.rollback();raise HTTPException(409,'Collection changed or is unavailable. Refresh before removing.')
    db.add(AuditLog(actor=identity.email,action='research-removed',target=payload.id,reason='Owner removed a private research collection.'))
    db.commit();return {'removed':True}
