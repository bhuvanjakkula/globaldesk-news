from datetime import datetime,timedelta,timezone
from types import SimpleNamespace
from urllib.parse import urlsplit,parse_qs
from uuid import uuid4
import pytest
from sqlalchemy import delete,select
from app.models import Article,OwnerWatch,Source,WatchReview
from app.owner_access import issue_link
from app.watchdesk import analyze,content_hash,evidence,phrase_in,words

ORIGIN={'Origin':'http://127.0.0.1:3000'}
NOW=datetime(2026,10,17,6,tzinfo=timezone.utc)

def article(title='AI laboratory launches battery pilot',summary='A software supply-chain demonstration.',hours=1):
    return SimpleNamespace(id=1,slug='unit-story',title=title,summary=summary,url=None,
        source=SimpleNamespace(id=1,name='Fixture',domain='fixture.invalid',region='Global'),
        category=SimpleNamespace(slug='technology',name='Technology',description=''),country='Global',language='English',
        published_at=NOW-timedelta(hours=hours),is_demo=True)

def watch(**kwargs):
    return SimpleNamespace(id='a'*32,name='AI monitor',keywords=['ai'],exclude=[],match_mode='any',category=None,hours=168,**kwargs)

def test_word_phrase_matching_resists_substrings_and_handles_unicode():
    assert not phrase_in('ai',words('A spokesperson said the plan was ready'))
    assert phrase_in('AI',words('New ＡＩ research'))
    assert phrase_in('supply chain',words('A software supply-chain update'))
    assert not phrase_in('chain supply',words('A software supply chain update'))

def test_inclusion_exclusion_and_all_phrase_evidence():
    a=article();w=watch()
    assert evidence(a,w)==[{'phrase':'ai','fields':['headline']}]
    w.keywords=['ai','supply chain'];w.match_mode='all'
    assert evidence(a,w)[1]['fields']==['description']
    w.exclude=['demonstration'];assert evidence(a,w) is None
    w.exclude=[];w.category='business';assert evidence(a,w) is None

def test_equal_windows_and_content_aware_review_checkpoint():
    a=article();b=article(hours=200);b.id=2;b.slug='previous'
    w=watch();result,current=analyze(w,[a,b],{},NOW)
    assert result['current_count']==result['previous_count']==1
    assert result['trend']=='steady' and result['change_percent']==0
    assert result['unreviewed_count']==1
    fingerprints={(w.id,a.id):content_hash(a)}
    assert analyze(w,[a,b],fingerprints,NOW)[0]['unreviewed_count']==0
    a.title='AI laboratory updates battery pilot'
    assert analyze(w,[a,b],fingerprints,NOW)[0]['unreviewed_count']==1

def test_missing_baseline_truncation_and_future_records():
    a=article();w=watch()
    result,_=analyze(w,[a],{},NOW)
    assert result['trend']=='first observed' and result['change_percent'] is None
    assert analyze(w,[a],{},NOW,True)[0]['trend']=='incomplete sample'
    assert analyze(w,[a],{},NOW,True)[0]['change_percent'] is None
    a.published_at=NOW+timedelta(hours=1)
    assert analyze(w,[a],{},NOW)[0]['current_count']==0

@pytest.fixture()
def owner(client,session):
    session.execute(delete(WatchReview));session.execute(delete(OwnerWatch));session.commit()
    link=issue_link(session);token=parse_qs(urlsplit(link).fragment)['token'][0]
    response=client.post('/api/v1/owner/redeem',headers=ORIGIN,json={'token':token})
    headers={**ORIGIN,'Authorization':'Bearer '+response.json()['session_token']}
    yield headers
    session.execute(delete(WatchReview));session.execute(delete(OwnerWatch));session.commit()

def save(client,owner,**kwargs):
    payload={'name':'AI & cyber','keywords':['AI','software'],'category':'technology','hours':168,**kwargs}
    return client.post('/api/v1/owner/watch/save',headers=owner,json=payload)

def test_watch_auth_origin_and_validation(client,owner):
    assert client.get('/api/v1/owner/watch/report').status_code==401
    assert client.post('/api/v1/owner/watch/save',headers=ORIGIN,json={'name':'x','keywords':['AI']}).status_code==401
    assert save(client,{**owner,'Origin':'https://attacker.invalid'}).status_code==403
    for invalid in [{'keywords':[]},{'keywords':['!!!']},{'keywords':['x'*61]},{'hours':999},{'category':'not-a-section'},{'owner_email':'attacker.invalid'}]:
        assert save(client,owner,**invalid).status_code==422

def test_save_report_review_and_edit_reset(client,owner):
    created=save(client,owner);assert created.status_code==200
    watch_id=created.json()['id']
    data=client.get('/api/v1/owner/watch/report',headers=owner).json()
    monitor=data['monitors'][0]
    assert monitor['current_count']>=1 and monitor['unreviewed_count']>=1
    assert monitor['items'][0]['evidence']
    assert monitor['items'][0]['article']['published_at'].endswith(('Z','+00:00'))
    assert all(item['article']['is_demo'] for item in monitor['items'])
    assert client.post('/api/v1/owner/watch/review',headers=owner,json={'id':watch_id}).status_code==200
    assert client.get('/api/v1/owner/watch/report',headers=owner).json()['monitors'][0]['unreviewed_count']==0
    assert save(client,owner,id=watch_id,name='Updated AI monitor').status_code==200
    assert client.get('/api/v1/owner/watch/report',headers=owner).json()['monitors'][0]['unreviewed_count']>=1

def test_changed_story_reenters_review_queue(client,owner,session):
    watch_id=save(client,owner).json()['id']
    client.post('/api/v1/owner/watch/review',headers=owner,json={'id':watch_id})
    story=session.scalar(select(Article).where(Article.slug=='demo-technology-5'))
    old=story.title
    try:
        story.title='Revised AI evaluation tools demonstration';session.commit()
        report=client.get('/api/v1/owner/watch/report',headers=owner).json()
        assert any(item['article']['slug']==story.slug and item['new_or_changed'] for item in report['monitors'][0]['items'])
    finally:story.title=old;session.commit()

def test_blocked_or_withdrawn_content_is_hidden(client,owner,session):
    save(client,owner)
    source=session.scalar(select(Source).where(Source.domain=='example.org'))
    old=source.permission.status
    try:
        source.permission.status='blocked';session.commit()
        report=client.get('/api/v1/owner/watch/report',headers=owner).json()
        assert report['sampled_articles']==0
        assert report['monitors'][0]['current_count']==0 and report['monitors'][0]['items']==[]
    finally:source.permission.status=old;session.commit()

def test_twelve_monitor_cap_and_isolation(client,owner,session):
    for i in range(12):assert save(client,owner,name=f'Monitor {i}').status_code==200
    assert save(client,owner).status_code==409
    alien=OwnerWatch(id=uuid4().hex,owner_email='other-owner.invalid',slot=0,name='Private other monitor',
        keywords=['AI'],exclude=[],match_mode='any',category=None,hours=168)
    session.add(alien);session.commit()
    assert len(client.get('/api/v1/owner/watch/report',headers=owner).json()['monitors'])==12
    for action in ['remove','review']:
        assert client.post('/api/v1/owner/watch/'+action,headers=owner,json={'id':alien.id}).status_code==404
    assert save(client,owner,id=alien.id).status_code==404

def test_remove_cleans_review_records(client,owner,session):
    watch_id=save(client,owner).json()['id']
    client.post('/api/v1/owner/watch/review',headers=owner,json={'id':watch_id})
    assert session.scalar(select(WatchReview).where(WatchReview.watch_id==watch_id)) is not None
    assert client.post('/api/v1/owner/watch/remove',headers=owner,json={'id':watch_id}).status_code==200
    assert session.scalar(select(WatchReview).where(WatchReview.watch_id==watch_id)) is None
    assert client.get('/api/v1/owner/watch/report',headers=owner).json()['monitors']==[]


def test_database_sample_cap_suppresses_partial_trend(client,owner,session):
    from app.models import Category
    source=session.scalar(select(Source).where(Source.domain=='example.org'))
    category=session.scalar(select(Category).where(Category.slug=='technology'))
    prefix='cap-check-'+uuid4().hex+'-'
    now=datetime.now(timezone.utc)
    try:
        session.add_all([Article(slug=prefix+str(i),title=f'AI sample coverage {i}',summary=None,
            source_id=source.id,category_id=category.id,country='Global',language='English',
            published_at=now-timedelta(minutes=1),status='published',is_demo=True,origin='fixture') for i in range(605)])
        session.commit()
        assert save(client,owner,keywords=['AI'],hours=24).status_code==200
        report=client.get('/api/v1/owner/watch/report',headers=owner).json()
        assert report['sampled_articles']==report['sample_limit']==600
        assert report['truncated'] is True
        assert report['monitors'][0]['trend']=='incomplete sample'
        assert report['monitors'][0]['change_percent'] is None
        assert len(report['monitors'][0]['items'])==8
    finally:
        session.execute(delete(Article).where(Article.slug.like(prefix+'%')));session.commit()
