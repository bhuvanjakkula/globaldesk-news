"""Bounded live title/link collection; no abstracts, article bodies or images."""
import argparse
from datetime import datetime,timedelta,timezone
from hashlib import sha256
from html import unescape
import logging
import re
import time
from urllib.parse import quote,urlsplit
from uuid import uuid4
import xml.etree.ElementTree as ET
import httpx
from sqlalchemy import select
from .settings import FEED_REFRESH_SECONDS
from .db import SessionLocal
from .models import Source,SourcePermission,AuditLog,InnovationSignal,IngestionRun
from .permissions import can_display
from .innovation import classify,TOPICS

GOVUK='https://www.gov.uk/search/news-and-communications.atom'
CROSSREF='https://api.crossref.org/works'
SOURCES={
 'www.gov.uk':('GOV.UK · Science, Innovation and Technology','Europe','OGL v3.0; title/link metadata; https://www.gov.uk/help/reuse-govuk-content'),
 'api.crossref.org':('Crossref · Global research metadata','Unspecified','Public bibliographic metadata; abstracts excluded; https://www.crossref.org/documentation/retrieve-metadata/rest-api/'),
}


def clean(value):return re.sub(r'\s+',' ',unescape(re.sub('<[^>]+>','',str(value)))).strip()


def bounded_get(client,url,params=None):
    with client.stream('GET',url,params=params) as response:
        response.raise_for_status();data=bytearray()
        for chunk in response.iter_bytes():
            data.extend(chunk)
            if len(data)>2_000_000:raise ValueError('Upstream response exceeded limit')
        return bytes(data)


def parse_atom(data,now):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():raise ValueError('Unsafe XML')
    root=ET.fromstring(data);ns={'a':'http://www.w3.org/2005/Atom'};result=[]
    for entry in root.findall('a:entry',ns)[:100]:
        title=clean(entry.findtext('a:title',default='',namespaces=ns))
        links=entry.findall('a:link',ns)
        url=next((e.get('href','') for e in links if e.get('rel','alternate')=='alternate'),'')
        date=entry.findtext('a:published',namespaces=ns) or entry.findtext('a:updated',namespaces=ns)
        try:published=datetime.fromisoformat(date.replace('Z','+00:00'))
        except (ValueError,AttributeError):continue
        if published.tzinfo is None or published>now:continue
        parsed=urlsplit(url)
        if parsed.scheme!='https' or parsed.hostname!='www.gov.uk' or parsed.username or parsed.password or parsed.port not in (None,443):continue
        # Restrict to original official announcements; do not mix guidance updates with news.
        if not parsed.path.startswith('/government/news/'):continue
        if not classify(title) or not 5<=len(title)<=500:continue
        result.append({'title':title,'url':url,'published_at':published,'publisher':'UK Department for Science, Innovation and Technology','kind':'official_update','region':'Europe'})
    return result


def parse_crossref(items,now):
    result=[]
    for item in items[:30]:
        title=clean((item.get('title') or [''])[0]);doi=item.get('DOI','')
        parts=(item.get('published',{}).get('date-parts') or [[]])[0]
        try:published=datetime(*parts[:3],tzinfo=timezone.utc) if len(parts)>=3 else None
        except (ValueError,TypeError):continue
        if not published or published>now or not re.fullmatch(r'10\.\d{4,9}/\S+',doi) or len(doi)>500:continue
        if not 5<=len(title)<=500 or not classify(title):continue
        result.append({'title':title,'url':'https://doi.org/'+quote(doi,safe='/():;.-_'),'published_at':published,
            'publisher':clean(item.get('publisher','Unspecified publisher'))[:220],'kind':'research','region':'Unspecified'})
    return result


def register_sources(db):
    sources={}
    for domain,(name,region,basis) in SOURCES.items():
        source=db.scalar(select(Source).where(Source.domain==domain))
        if source is None:
            source=Source(name=name,domain=domain,region=region,source_type='open_metadata');db.add(source);db.flush()
            db.add(SourcePermission(source_id=source.id,access_method='official_metadata',status='approved',public_metadata_allowed=True,
                ai_processing_allowed=False,rights_basis=basis,notes='Only title, original URL and publication metadata. No images, abstracts, full text or endorsement.',reviewed_at=datetime.now(timezone.utc)))
            db.add(AuditLog(actor='GlobalDesk source configuration',action='open-metadata-source-added',target=domain,reason=basis))
            db.flush();db.refresh(source)
        # Existing blocks, expirations and pending reviews are never overridden.
        sources[domain]=source
    db.commit();return sources


def store(db,source,records):
    if not can_display(source.permission):return {'stored':0,'disabled':True}
    count=0
    for record in records:
        key=sha256(record['url'].encode()).hexdigest();row=db.get(InnovationSignal,key)
        if row and row.status!='published':continue
        values={**record,'topics':list(classify(record['title'])),'fetched_at':datetime.now(timezone.utc)}
        if row:
            for field,value in values.items():setattr(row,field,value)
        else:db.add(InnovationSignal(id=key,source_id=source.id,status='published',**values))
        count+=1
    db.commit();return {'stored':count}


def refresh():
    now=datetime.now(timezone.utc);identifier='radar-'+uuid4().hex[:26];output={}
    with SessionLocal() as db:
        sources=register_sources(db)
        db.add(IngestionRun(id=identifier,status='running',results={}));db.commit()
        with httpx.Client(timeout=25,follow_redirects=False,headers={'User-Agent':'GlobalDesk/0.11 (title-link metadata research)'}) as client:
            try:output['govuk']=store(db,sources['www.gov.uk'],parse_atom(bounded_get(client,GOVUK,{'organisations[]':'department-for-science-innovation-and-technology'}),now))
            except Exception as exc:db.rollback();output['govuk']={'error':type(exc).__name__}
            import json
            for key,(_,terms) in TOPICS.items():
                try:
                    time.sleep(1)
                    raw=bounded_get(client,CROSSREF,{'query.title':terms[0],'filter':f'from-pub-date:{(now-timedelta(days=90)).date()},until-pub-date:{now.date()},type:journal-article',
                        'rows':12,'sort':'published','order':'desc','select':'DOI,title,published,publisher'})
                    output[key]=store(db,sources['api.crossref.org'],parse_crossref(json.loads(raw).get('message',{}).get('items',[]),now))
                except Exception as exc:db.rollback();output[key]={'error':type(exc).__name__}
        run=db.get(IngestionRun,identifier);run.status='partial_failure' if any('error' in v for v in output.values()) else 'completed'
        run.results=output;run.finished_at=datetime.now(timezone.utc);db.commit()
    return output


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--watch',action='store_true',help='Refresh connected feeds at the configured bounded interval')
    args=parser.parse_args()
    if args.watch:
        with SessionLocal() as db:
            last=db.scalar(select(IngestionRun).where(IngestionRun.id.like('radar-%'),IngestionRun.finished_at.is_not(None)).order_by(IngestionRun.finished_at.desc()).limit(1))
            if last:
                from .owner_access import as_utc
                delay=max(0,FEED_REFRESH_SECONDS-(datetime.now(timezone.utc)-as_utc(last.finished_at)).total_seconds())
                print(f'Innovation refresh service active; next refresh in {round(delay)} seconds.',flush=True)
            else:delay=0
        time.sleep(delay)
    while True:
        print(refresh(),flush=True)
        if not args.watch:break
        time.sleep(FEED_REFRESH_SECONDS)
