"""Explainable technology signals from currently permitted metadata."""
from collections import Counter
from datetime import datetime,timedelta,timezone
import re
import unicodedata
from fastapi import APIRouter,Depends,Query
from sqlalchemy import select
from sqlalchemy.orm import Session,joinedload
from .db import get_db
from .models import InnovationSignal,IngestionRun,Source
from .permissions import display_conditions
from .owner_access import as_utc

TOPICS={
 'ai':('Artificial intelligence',['artificial intelligence','machine learning','generative ai','ai','neural network']),
 'quantum':('Quantum',['quantum']),
 'chips':('Semiconductors',['semiconductor','semiconductors','microchip','microchips','photonics','microelectronics','integrated circuit','computer chip','silicon chip']),
 'robotics':('Robotics',['robot','robots','robotics','autonomous']),
 'climate':('Climate & energy',['climate change','climate technology','renewable','battery','batteries','hydrogen','solar','energy storage','carbon capture','decarbonization']),
 'space':('Space',['space technology','spaceflight','spacecraft','space exploration','space mission','satellite','satellites','rocket','rockets','aerospace','launch vehicle']),
 'biotech':('Biotechnology',['biotech','genome','genomic','gene editing','synthetic biology']),
 'cyber':('Cybersecurity',['cybersecurity','cyber','encryption','post quantum','cryptography']),
}
router=APIRouter(prefix='/api/v1/innovation',tags=['innovation radar'])


def classify(title):
    text=' '.join(re.findall(r'[^\W_]+',unicodedata.normalize('NFKC',title).casefold()))
    padded=' '+text+' '
    return {key:[term for term in terms if ' '+term+' ' in padded] for key,(_,terms) in TOPICS.items() if any(' '+term+' ' in padded for term in terms)}


@router.get('/signals')
def signals(days:int=Query(30,ge=1,le=90),topic:str|None=Query(None,max_length=32),
            kind:str|None=Query(None,pattern='^(research|official_update)$'),region:str|None=Query(None,max_length=40),
            q:str|None=Query(None,max_length=100),db:Session=Depends(get_db)):
    now=datetime.now(timezone.utc)
    base=select(InnovationSignal).join(InnovationSignal.source).join(Source.permission).where(
        InnovationSignal.status=='published',InnovationSignal.published_at<=now,
        InnovationSignal.published_at>=now-timedelta(days=days),*display_conditions())
    rows=db.scalars(base.options(joinedload(InnovationSignal.source)).order_by(InnovationSignal.published_at.desc(),InnovationSignal.id).limit(501)).all()
    truncated=len(rows)>500;rows=rows[:500]
    labels={s.id:classify(s.title) for s in rows}
    rows=[s for s in rows if labels[s.id]]
    matching=[s for s in rows if (not topic or topic in labels[s.id]) and (not kind or s.kind==kind)
              and (not region or s.region==region) and (not q or q.casefold() in s.title.casefold())]
    counts=Counter(t for s in rows for t in labels[s.id])
    latest=db.scalar(select(IngestionRun).where(IngestionRun.id.like('radar-%')).order_by(IngestionRun.started_at.desc()).limit(1))
    last_success=db.scalar(select(IngestionRun).where(IngestionRun.id.like('radar-%'),IngestionRun.status=='completed').order_by(IngestionRun.finished_at.desc()).limit(1))
    return {'generated_at':now,'days':days,'total':len(matching),'sampled':len(rows),'truncated':truncated,
        'topics':[{'slug':k,'name':name,'count':counts[k]} for k,(name,_) in TOPICS.items()],
        'publishers':len({s.publisher for s in matching}),'regions':sorted({s.region for s in rows}),
        'last_refresh':as_utc(latest.finished_at or latest.started_at) if latest else None,
        'refresh_status':latest.status if latest else 'not_started',
        'last_success':as_utc(last_success.finished_at) if last_success else None,
        'items':[{'id':s.id,'title':s.title,'url':s.url,'publisher':s.publisher,'kind':s.kind,'region':s.region,
            'published_at':as_utc(s.published_at),'fetched_at':as_utc(s.fetched_at),'topics':list(labels[s.id]),
            'matched_terms':classify(s.title),'source':s.source.name,'rights_basis':s.source.permission.rights_basis,
            'licence_url':'https://www.gov.uk/help/reuse-govuk-content' if s.kind=='official_update' else 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/'} for s in matching[:60]],
        'shown':min(len(matching),60),
        'coverage_note':'Region describes the issuing source, not where an event happened. Research location is unspecified. Publisher counts are metadata labels, not independently verified sources. This is a bounded sample, not comprehensive global coverage.'}
