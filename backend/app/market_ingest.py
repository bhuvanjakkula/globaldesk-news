"""Collect public official finance headlines. No prices, article bodies or trade advice."""
import argparse
import re
from datetime import datetime,timezone
from email.utils import parsedate_to_datetime
from hashlib import sha256
import time
from urllib.parse import urlsplit
from uuid import uuid4
import xml.etree.ElementTree as ET
import httpx
from sqlalchemy import select
from .settings import FEED_REFRESH_SECONDS
from .db import SessionLocal
from .models import Source,SourcePermission,AuditLog,FinanceSignal,IngestionRun
from .permissions import can_display
from .innovation_ingest import bounded_get,clean
from .markets import classify
from .owner_access import as_utc

FEEDS={
 'sec':{'url':'https://www.sec.gov/news/pressreleases.rss','domain':'www.sec.gov','name':'U.S. Securities and Exchange Commission','region':'North America','policy':'https://www.sec.gov/files/about/webmaster-faq.htm','basis':'SEC government-created title/link content permitted for reuse; webmaster FAQ. No third-party material.'},
 'fed':{'url':'https://www.federalreserve.gov/feeds/press_all.xml','domain':'www.federalreserve.gov','name':'Federal Reserve Board','region':'North America','policy':'https://www.federalreserve.gov/website-linking-policies.htm','basis':'Federal Reserve Board official government press-release title/link metadata; no third-party images or authored papers.'},
 'ecb':{'url':'https://www.ecb.europa.eu/rss/press.html','domain':'www.ecb.europa.eu','name':'European Central Bank','region':'Europe','policy':'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html','basis':'ECB reuse policy: accurate title/link metadata with attribution. Excludes authored papers; freely available at ECB website.'}}


def parse_feed(data,config,now):
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():raise ValueError('Unsafe XML')
    root=ET.fromstring(data);output=[]
    for item in root.findall('./channel/item')[:100]:
        title=clean(item.findtext('title',''));url=item.findtext('link','').strip()
        try:
            published=parsedate_to_datetime(item.findtext('pubDate',''));u=urlsplit(url)
            if published.tzinfo is None or published>now or u.scheme!='https' or u.hostname!=config['domain'] or u.username or u.password or u.port not in (None,443):continue
        except (ValueError,TypeError,AttributeError):continue
        # ECB's authored papers have separate reuse requirements; never import those.
        if config['domain']=='www.ecb.europa.eu':
            path=re.sub('/+','/',u.path)
            if not path.startswith('/press/pr/'):continue
            url=u._replace(path=path).geturl()
        if not 5<=len(title)<=500 or len(url)>2048:continue
        output.append({'title':title,'url':url,'published_at':published,'topics':classify(title),'region':config['region']})
    return output


def store(db,source,records):
    if not can_display(source.permission):return {'stored':0,'disabled':True}
    count=0
    for value in records:
        key=sha256(value['url'].encode()).hexdigest();record=db.get(FinanceSignal,key)
        if record and record.status!='published':continue
        values={**value,'fetched_at':datetime.now(timezone.utc)}
        if record:
            for k,v in values.items():setattr(record,k,v)
        else:db.add(FinanceSignal(id=key,source_id=source.id,status='published',**values))
        count+=1
    db.commit();return {'stored':count}


def refresh():
    now=datetime.now(timezone.utc);identifier='markets-'+uuid4().hex[:24];results={}
    with SessionLocal() as db:
        db.add(IngestionRun(id=identifier,status='running',results={}));db.commit()
        with httpx.Client(timeout=25,follow_redirects=False,headers={'User-Agent':'GlobalDeskMarketNews/0.12 public-feed-reader'}) as client:
            for key,config in FEEDS.items():
                try:
                    source=db.scalar(select(Source).where(Source.domain==config['domain']))
                    if source is None:
                        source=Source(name=config['name'],domain=config['domain'],region=config['region'],source_type='official_finance');db.add(source);db.flush()
                        db.add(SourcePermission(source_id=source.id,status='approved',public_metadata_allowed=True,ai_processing_allowed=False,
                            access_method='official_rss',rights_basis=config['basis'],notes=config['policy'],reviewed_at=now))
                        db.add(AuditLog(actor='GlobalDesk source configuration',action='official-finance-source-added',target=config['domain'],reason=config['basis']+' '+config['policy']))
                        db.commit();db.refresh(source)
                    if not can_display(source.permission):results[key]={'disabled':True,'stored':0};continue
                    data=bounded_get(client,config['url']);results[key]=store(db,source,parse_feed(data,config,now))
                except Exception as exc:db.rollback();results[key]={'error':type(exc).__name__}
                time.sleep(1)
        run=db.get(IngestionRun,identifier);run.status='partial_failure' if any('error' in r for r in results.values()) else 'completed'
        run.results=results;run.finished_at=datetime.now(timezone.utc);db.commit()
    return results


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--watch',action='store_true');args=parser.parse_args()
    if args.watch:
        with SessionLocal() as db:
            last=db.scalar(select(IngestionRun).where(IngestionRun.id.like('markets-%'),IngestionRun.finished_at.is_not(None)).order_by(IngestionRun.finished_at.desc()).limit(1))
            delay=max(0,FEED_REFRESH_SECONDS-(datetime.now(timezone.utc)-as_utc(last.finished_at)).total_seconds()) if last else 0
        print(f'Market news refresh service active; next refresh in {round(delay)} seconds.',flush=True);time.sleep(delay)
    while True:
        print(refresh(),flush=True)
        if not args.watch:break
        time.sleep(FEED_REFRESH_SECONDS)
