"""Official finance news metadata, independent of price/trading services."""
from collections import Counter
from datetime import datetime,timedelta,timezone
import re
from fastapi import APIRouter,Depends,Query
from sqlalchemy import select
from sqlalchemy.orm import Session,joinedload
from .db import get_db
from .models import FinanceSignal,IngestionRun,Source
from .permissions import display_conditions
from .owner_access import as_utc

TOPICS={'equities':('Equities & listings',['stock','stocks','equity','equities','listing','ipo','capital markets']),
 'funds':('Funds & investing',['fund','funds','etf','etfs','investment','investor','investors','asset management']),
 'rates':('Rates & economy',['rate','rates','inflation','monetary','economy','economic','interest','bank','banks','banking']),
 'regulation':('Regulation',['sec','securities','charges','charged','enforcement','rule','rules','regulation','fraud','settles']),
 'digital':('Digital finance',['crypto','digital asset','digital assets','token','bitcoin','blockchain','fintech'])}
router=APIRouter(prefix='/api/v1/markets',tags=['financial markets'])


def classify(title):
    text=' '+' '.join(re.findall(r'[^\W_]+',title.casefold()))+' '
    return [key for key,(_,terms) in TOPICS.items() if any(' '+t+' ' in text for t in terms)] or ['market-updates']


@router.get('/news')
def news(days:int=Query(30,ge=1,le=90),topic:str|None=Query(None,max_length=32),region:str|None=Query(None,max_length=40),q:str|None=Query(None,max_length=100),db:Session=Depends(get_db)):
    now=datetime.now(timezone.utc)
    records=db.scalars(select(FinanceSignal).join(FinanceSignal.source).join(Source.permission).where(
        FinanceSignal.status=='published',FinanceSignal.published_at<=now,FinanceSignal.published_at>=now-timedelta(days=days),*display_conditions())
        .options(joinedload(FinanceSignal.source)).order_by(FinanceSignal.published_at.desc(),FinanceSignal.id).limit(501)).all()
    truncated=len(records)>500;records=records[:500]
    selected=[s for s in records if (not topic or topic in s.topics) and (not region or s.region==region) and (not q or q.casefold() in s.title.casefold())]
    counts=Counter(t for s in records for t in s.topics)
    latest=db.scalar(select(IngestionRun).where(IngestionRun.id.like('markets-%')).order_by(IngestionRun.started_at.desc()).limit(1))
    return {'days':days,'total':len(selected),'shown':min(60,len(selected)),'truncated':truncated,
        'source_count':len({s.source_id for s in selected}),'regions':sorted({s.region for s in records}),
        'topics':[{'slug':k,'name':v[0],'count':counts[k]} for k,v in TOPICS.items()],
        'last_refresh':as_utc(latest.finished_at or latest.started_at) if latest else None,
        'refresh_status':latest.status if latest else 'not_started','feed_results':latest.results if latest else {},
        'items':[{'id':s.id,'title':s.title,'url':s.url,'source':s.source.name,'region':s.region,'topics':s.topics,
                  'published_at':as_utc(s.published_at),'fetched_at':as_utc(s.fetched_at),'rights_basis':s.source.permission.rights_basis} for s in selected[:60]]}
