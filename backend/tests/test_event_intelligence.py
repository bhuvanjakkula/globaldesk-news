from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from app.intelligence import group_articles
from app.models import Article, Source
from sqlalchemy import select

NOW = datetime.now(timezone.utc)
def item(slug, title, domain='one.invalid', hours=0, category_id=1, language='English'):
    return SimpleNamespace(slug=slug, title=title, source=SimpleNamespace(id=1,name=domain,domain=domain,region='Global'),
        category=SimpleNamespace(slug='technology',name='Technology',description='Technology'), category_id=category_id,
        published_at=NOW-timedelta(hours=hours),is_demo=False, summary=None,url=f'https://{domain}/{slug}',
        country='Global',language=language)

def test_related_headlines_group_with_inspectable_terms():
    a=item('a','Orion satellite launch reaches lunar orbit')
    b=item('b','Orion satellite launch reaches lunar orbit successfully','two.invalid')
    c=item('c','Gallery opens contemporary sculpture exhibition')
    groups=group_articles([a,b,c])
    assert len(groups)==2
    assert groups[0]['source_count']==2
    assert groups[0]['article_count']==2
    assert 'orion' in groups[0]['shared_terms']
    assert groups[0]['minimum_similarity'] >= .42
    assert groups == group_articles([c,b,a])

def test_temporal_language_and_section_boundaries():
    title='Orion satellite launch reaches lunar orbit'
    rows=[item('a',title),item('b',title,hours=73),item('c',title,language='French'),item('d',title,category_id=2)]
    assert len(group_articles(rows))==4

def test_complete_link_blocks_transitive_chain():
    rows=[item('a','alpha beta gamma delta'),item('b','alpha beta gamma delta epsilon zeta eta theta'),
          item('c','epsilon zeta eta theta')]
    groups=group_articles(rows)
    assert len(groups)>=2
    assert not any(g['article_count']==3 for g in groups)

def test_repeated_publisher_not_counted_twice_and_empty_titles_safe():
    title='Orion satellite launch reaches lunar orbit'
    groups=group_articles([item('a',title),item('b',title)])
    assert groups[0]['source_count']==1
    assert len(group_articles([item('c','the and of'),item('d','the and of')]))==2
    assert group_articles([])==[]

def test_intelligence_contract_and_validation(client):
    response=client.get('/api/v1/intelligence/events')
    assert response.status_code==200
    data=response.json()
    assert data['algorithm']=='headline-tfidf-complete-link-v1'
    assert data['sample_limit']==300
    assert data['demo_articles']>0
    assert all(a['is_demo'] for e in data['events'] for a in e['articles'])
    assert client.get('/api/v1/intelligence/events?hours=0').status_code==422
    assert client.get('/api/v1/intelligence/events?hours=721').status_code==422
    assert client.get('/api/v1/intelligence/events?min_sources=0').status_code==422
    assert client.get('/api/v1/intelligence/events?min_sources=2').json()['events']==[]
    assert client.get('/api/v1/intelligence/events?category=missing').json()['analyzed_articles']==0

def test_intelligence_excludes_blocked_and_withdrawn(client,session):
    source=session.scalar(select(Source).where(Source.domain=='example.org'))
    old=source.permission.status
    try:
        source.permission.status='blocked';session.commit()
        assert client.get('/api/v1/intelligence/events').json()['analyzed_articles']==0
    finally:
        source.permission.status=old;session.commit()
    article=session.scalar(select(Article).where(Article.status=='published'))
    old=article.status
    try:
        article.status='withdrawn';session.commit()
        report=client.get('/api/v1/intelligence/events').json()
        assert article.slug not in [a['slug'] for e in report['events'] for a in e['articles']]
    finally:
        article.status=old;session.commit()
