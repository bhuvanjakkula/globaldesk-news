from datetime import datetime,timedelta,timezone
from uuid import uuid4
import pytest
from sqlalchemy import delete
from app.innovation import classify
from app.innovation_ingest import parse_atom,parse_crossref,store
from app.models import InnovationSignal,Source,SourcePermission

NOW=datetime(2026,10,17,12,tzinfo=timezone.utc)


def test_classification_word_boundaries_and_multiple_topics():
    assert classify('A spokesperson said the plan was ready')=={}
    assert classify('Public space and emotional climate in family life')=={}
    assert set(classify('ＡＩ and quantum encryption for satellite networks'))=={'ai','quantum','cyber','space'}
    assert classify('Renewable hydrogen energy storage')['climate']==['renewable','hydrogen','energy storage']


def test_crossref_excludes_future_invalid_dates_and_abstracts():
    item={'title':['<b>Quantum</b> &amp; AI chips'],'DOI':'10.1234/test','published':{'date-parts':[[2026,10,16]]},'publisher':'Fixture publisher','abstract':'Must not be retained'}
    rows=parse_crossref([item],NOW)
    assert len(rows)==1 and rows[0]['title']=='Quantum & AI chips' and 'abstract' not in rows[0]
    assert rows[0]['url']=='https://doi.org/10.1234/test'
    for change in [{'DOI':'javascript:bad'},{'published':{'date-parts':[[2027,1,1]]}},{'published':{'date-parts':[[2026]]}},{'title':['Unrelated general text']}]:
        assert parse_crossref([{**item,**change}],NOW)==[]


def test_atom_only_original_announcements_and_safe_xml():
    template='<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>AI science funding announced</title><updated>2026-10-16T10:00:00Z</updated><link href="{url}"/></entry></feed>'
    assert len(parse_atom(template.format(url='https://www.gov.uk/government/news/ai-plan').encode(),NOW))==1
    for url in ['https://attacker.invalid/government/news/x','https://www.gov.uk/government/publications/ai-plan','http://www.gov.uk/government/news/x']:
        assert parse_atom(template.format(url=url).encode(),NOW)==[]
    with pytest.raises(ValueError):parse_atom(b'<!DOCTYPE feed><feed/>',NOW)


@pytest.fixture()
def innovation_source(session):
    source=Source(name='Radar fixture',domain=uuid4().hex+'.invalid',region='Europe',source_type='fixture')
    session.add(source);session.flush()
    permission=SourcePermission(source_id=source.id,status='approved',public_metadata_allowed=True,ai_processing_allowed=False,rights_basis='Fixture only')
    session.add(permission);session.commit();session.refresh(source)
    yield source
    session.execute(delete(InnovationSignal).where(InnovationSignal.source_id==source.id));session.delete(permission);session.delete(source);session.commit()


def test_radar_filters_freshness_deduplication_and_permission_gate(client,session,innovation_source):
    now=datetime.now(timezone.utc)
    records=[{'title':'Quantum AI satellite research','url':'https://doi.org/10.1234/fixture-'+innovation_source.domain,'published_at':now-timedelta(days=1),
              'publisher':'Fixture publisher','kind':'research','region':'Unspecified'}]
    assert store(session,innovation_source,records)['stored']==1
    assert store(session,innovation_source,records)['stored']==1
    result=client.get('/api/v1/innovation/signals?topic=quantum').json()
    assert result['total']==1 and result['publishers']==1 and result['items'][0]['matched_terms']['ai']==['ai']
    assert client.get('/api/v1/innovation/signals?kind=official_update').json()['total']==0
    assert client.get('/api/v1/innovation/signals?region=Europe').json()['total']==0
    assert client.get('/api/v1/innovation/signals?q=unmatched').json()['total']==0
    assert client.get('/api/v1/innovation/signals?days=0').status_code==422
    innovation_source.permission.expires_at=now-timedelta(seconds=1);session.commit()
    assert client.get('/api/v1/innovation/signals').json()['total']==0
    assert store(session,innovation_source,records)['disabled']
