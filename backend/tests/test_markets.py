from datetime import datetime,timedelta,timezone
from uuid import uuid4
import pytest
from sqlalchemy import delete
from app.market_ingest import parse_feed,store,FEEDS
from app.markets import classify
from app.models import FinanceSignal,Source,SourcePermission

NOW=datetime(2026,10,17,12,tzinfo=timezone.utc)


def rss(url='https://www.sec.gov/newsroom/press-releases/test',date='Fri, 16 Oct 2026 10:00:00 GMT'):
    return f'<rss><channel><item><title>SEC securities rules for investment funds</title><link>{url}</link><pubDate>{date}</pubDate></item></channel></rss>'.encode()


def test_market_topics_and_safe_feed_parser():
    assert set(classify('SEC rules on investment funds and stocks'))=={'equities','funds','regulation'}
    assert classify('A routine announcement')==['market-updates']
    assert len(parse_feed(rss(),FEEDS['sec'],NOW))==1
    assert not parse_feed(rss(url='https://bad.invalid/news/test'),FEEDS['sec'],NOW)
    assert not parse_feed(rss(date='Fri, 16 Oct 2027 10:00:00 GMT'),FEEDS['sec'],NOW)
    assert not parse_feed(rss(date='invalid'),FEEDS['sec'],NOW)
    with pytest.raises(ValueError):parse_feed(b'<!DOCTYPE rss><rss/>',FEEDS['sec'],NOW)


def test_ecb_only_press_releases_and_normalizes_double_slash():
    assert parse_feed(rss(url='https://www.ecb.europa.eu//press/pr/date/2026/test.html'),FEEDS['ecb'],NOW)[0]['url']=='https://www.ecb.europa.eu/press/pr/date/2026/test.html'
    assert not parse_feed(rss(url='https://www.ecb.europa.eu/press/key/date/2026/speech.html'),FEEDS['ecb'],NOW)
    assert not parse_feed(rss(url='https://www.ecb.europa.eu/pub/pdf/scpwps/paper.pdf'),FEEDS['ecb'],NOW)


def test_market_filters_permissions_deduplication_and_withdrawal(client,session):
    source=Source(name='Market fixture',domain=uuid4().hex+'.invalid',region='Europe',source_type='fixture')
    session.add(source);session.flush()
    permission=SourcePermission(source_id=source.id,status='approved',public_metadata_allowed=True,rights_basis='Fixture only')
    session.add(permission);session.commit();session.refresh(source)
    records=[{'title':'Investment funds and interest rates','url':'https://example.invalid/'+source.domain,'published_at':datetime.now(timezone.utc)-timedelta(days=1),'topics':['funds','rates'],'region':'Europe'}]
    try:
        assert store(session,source,records)=={'stored':1}
        assert store(session,source,records)=={'stored':1}
        data=client.get('/api/v1/markets/news?topic=funds').json()
        assert data['total']==1 and data['source_count']==1
        assert client.get('/api/v1/markets/news?region=North%20America').json()['total']==0
        assert client.get('/api/v1/markets/news?q=absent').json()['total']==0
        assert client.get('/api/v1/markets/news?days=91').status_code==422
        permission.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1);session.commit()
        assert client.get('/api/v1/markets/news').json()['total']==0
        assert store(session,source,records)['disabled']
        permission.expires_at=None;session.commit()
        row=session.get(FinanceSignal,data['items'][0]['id']);row.status='withdrawn';session.commit()
        assert store(session,source,records)=={'stored':0}
        assert client.get('/api/v1/markets/news').json()['total']==0
    finally:
        session.execute(delete(FinanceSignal).where(FinanceSignal.source_id==source.id));session.delete(permission);session.delete(source);session.commit()
