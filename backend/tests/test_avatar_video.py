from datetime import datetime,timedelta,timezone
import httpx
import pytest
from sqlalchemy import delete,select
from app import avatar_video as avatar
from app.models import AvatarVideo,Article,FinanceSignal,Source,SourcePermission


@pytest.fixture()
def media(monkeypatch,tmp_path,session):
    monkeypatch.setattr(avatar,'MEDIA',tmp_path/'generated')
    session.execute(delete(AvatarVideo));session.commit()
    yield avatar.MEDIA
    session.execute(delete(AvatarVideo));session.commit()


def demo(client):
    return client.get('/api/v1/broadcast?channel=demo').json()['items'][0]


def test_missing_credentials_and_no_public_generation(client,session,monkeypatch,media):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False);monkeypatch.delenv('DID_API_KEY',raising=False)
    item=demo(client)
    with pytest.raises(ValueError,match='Configure server'):
        avatar.render(session,'demo',item['id'])
    assert client.get('/api/v1/avatar',params={'channel':'demo','identifier':item['id']}).json()['status']=='not_generated'
    assert client.post('/api/v1/avatar').status_code==405
    assert not session.scalars(select(AvatarVideo)).all()


def test_ready_video_hides_after_content_drift_and_withdrawal(client,session,media):
    item=demo(client);record=AvatarVideo(id='a'*32,channel='demo',item_id=item['id'],fingerprint=avatar.fingerprint(item),status='ready')
    session.add(record);session.commit();media.mkdir();(media/(record.id+'.mp4')).write_bytes(b'test MP4 response fixture')
    url='/api/v1/avatar/file/'+record.id
    assert client.get(url).status_code==200
    query={'channel':'demo','identifier':item['id']}
    assert client.get('/api/v1/avatar',params=query).json()['video_url'].endswith(record.id)
    article=session.scalar(select(Article).where(Article.slug==item['id']));title,status=article.title,article.status
    try:
        article.title+=' revised';session.commit()
        assert client.get(url).status_code==404
        assert client.get('/api/v1/avatar',params=query).json()['status']=='not_generated'
        article.title=title;article.status='withdrawn';session.commit()
        assert client.get(url).status_code==404
    finally:article.title,article.status=title,status;session.commit()


def test_external_ai_rights_required_separately(client,session):
    source=Source(name='Avatar fixture',domain='avatar-fixture.invalid',source_type='official_finance')
    session.add(source);session.flush();permission=SourcePermission(source_id=source.id,status='approved',public_metadata_allowed=True,narration_allowed=True,ai_processing_allowed=False)
    session.add(permission);record=FinanceSignal(id='b'*64,title='Fixture headline for avatar test',url='https://avatar-fixture.invalid/news',source_id=source.id,region='Global',topics=[],published_at=datetime.now(timezone.utc)-timedelta(minutes=1),status='published');session.add(record);session.commit()
    try:
        assert client.get('/api/v1/avatar?channel=markets&identifier='+record.id).json()['status']=='unavailable'
        permission.ai_processing_allowed=True;session.commit()
        assert avatar.permitted_item(session,'markets',record.id)['narration_allowed']
    finally:
        session.delete(record);session.delete(permission);session.delete(source);session.commit()


def test_provider_http_contract_and_media_validation(monkeypatch,tmp_path):
    monkeypatch.setenv('OPENAI_API_KEY','test-secret-openai');monkeypatch.setenv('DID_API_KEY','test-secret-did')
    calls=[]
    def transport(request):
        calls.append((request.method,request.url.host,request.url.path))
        if request.url.host=='api.openai.com':
            assert request.headers['authorization']=='Bearer test-secret-openai'
            return httpx.Response(200,content=b'fake mp3')
        if request.url.path=='/audios':
            assert b'fake mp3' in request.content
            return httpx.Response(201,json={'url':'https://audios.d-id.com/test.wav'})
        if request.method=='POST' and request.url.path=='/talks':
            assert b'"type":"audio"' in request.content
            return httpx.Response(201,json={'id':'tlk_fixture'})
        if request.url.path=='/talks/tlk_fixture':
            return httpx.Response(200,json={'status':'done','result_url':'https://result.d-id.com/test.mp4'})
        assert 'authorization' not in request.headers
        return httpx.Response(200,content=b'\x00\x00\x00\x20ftypisom'+b'0'*80)
    with httpx.Client(transport=httpx.MockTransport(transport)) as client:
        audio=avatar.generate_audio(client,'I am an AI-generated presenter. Fictional demonstration.')
        job=avatar.create_talk(client,audio)
        target=tmp_path/'video.mp4';avatar.download_talk(client,job,target)
        assert target.is_file()
    assert len(calls)==5
    for url in ['http://result.d-id.com/x','https://result.d-id.com.evil.invalid/x','https://user:pass@result.d-id.com/x','https://127.0.0.1/x']:
        with pytest.raises(ValueError):avatar.approved_https(url,{'result.d-id.com'})


def test_render_dedupes_and_failure_has_no_playable_media(client,session,monkeypatch,media):
    monkeypatch.setenv('OPENAI_API_KEY','test-only');monkeypatch.setenv('DID_API_KEY','test-only')
    monkeypatch.setattr(avatar,'generate_audio',lambda client,script:b'mp3')
    monkeypatch.setattr(avatar,'create_talk',lambda client,audio:'tlk_test')
    def write(client,job,target):target.write_bytes(b'fake local result')
    monkeypatch.setattr(avatar,'download_talk',write)
    item=demo(client)
    first=avatar.render(session,'demo',item['id']);second=avatar.render(session,'demo',item['id'])
    assert first.id==second.id and first.status=='ready'
    def fail(client,script):raise RuntimeError('sensitive provider text must not be returned')
    monkeypatch.setattr(avatar,'generate_audio',fail)
    with pytest.raises(RuntimeError):avatar.render(session,'demo',item['id'],force=True)
    row=session.scalar(select(AvatarVideo).where(AvatarVideo.status=='failed'))
    assert row.error_code=='RuntimeError'
    assert not (media/(row.id+'.mp4')).exists()
    assert client.get('/api/v1/avatar/file/'+row.id).status_code==404
