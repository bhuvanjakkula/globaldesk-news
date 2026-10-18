"""OpenAI speech + D-ID talking video. Paid jobs run only through the trusted CLI."""
import argparse
from datetime import datetime
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlsplit
from uuid import uuid4
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db, SessionLocal
from .broadcast import check
from .models import AvatarVideo, FinanceSignal, InnovationSignal, AuditLog
from .owner_access import as_utc

router = APIRouter(prefix='/api/v1/avatar', tags=['realistic presenter videos'])
MEDIA = Path(__file__).resolve().parents[2] / 'generated-media'


def fingerprint(item):
    values={k:item[k] for k in ['id','title','source','url','spoken_text','published_at']}
    published=values['published_at']
    if isinstance(published,str):published=datetime.fromisoformat(published.replace('Z','+00:00'))
    values['published_at']=as_utc(published).isoformat()
    return sha256(json.dumps(values,sort_keys=True).encode()).hexdigest()


def permitted_item(db, channel, identifier):
    item = check(channel, identifier, db)
    if not item['narration_allowed']:
        raise HTTPException(403, 'Spoken reuse is not approved for this headline')
    if not item['is_demo']:
        model = {'markets':FinanceSignal, 'innovation':InnovationSignal}[channel]
        record = db.get(model, identifier)
        if not record or not record.source.permission.ai_processing_allowed:
            raise HTTPException(403, 'External AI processing is not approved for this source')
    return item


def credentials():
    names = ['OPENAI_API_KEY', 'DID_API_KEY']
    missing = [name for name in names if not os.getenv(name, '').strip()]
    return missing


def approved_https(url, hosts):
    value = urlsplit(url)
    if value.scheme != 'https' or value.hostname not in hosts or value.username or value.password or value.port not in (443,None):
        raise ValueError('Unexpected provider media URL')
    return url


def generate_audio(client, script):
    response = client.post('https://api.openai.com/v1/audio/speech', headers={
        'Authorization':'Bearer '+os.environ['OPENAI_API_KEY']}, json={
        'model':os.getenv('OPENAI_TTS_MODEL','gpt-4o-mini-tts'),
        'voice':os.getenv('OPENAI_TTS_VOICE','marin'), 'input':script,
        'instructions':'Read clearly as a calm professional news presenter. Preserve the exact words.',
        'response_format':'mp3'})
    response.raise_for_status()
    if not response.content or len(response.content)>6_000_000:
        raise ValueError('Unexpected speech output size')
    return response.content


def create_talk(client, audio):
    key=os.environ['DID_API_KEY'].strip()
    auth={'Authorization':key if key.startswith('Basic ') else 'Basic '+key}
    uploaded=client.post('https://api.d-id.com/audios', headers=auth,
        files={'audio':('globaldesk.mp3',audio,'audio/mpeg')})
    uploaded.raise_for_status()
    audio_url=uploaded.json()['url']
    # This reference comes directly from authenticated D-ID upload, and is sent
    # back to D-ID; our server does not fetch it.
    audio_reference=urlsplit(audio_url)
    if audio_reference.scheme not in {'https','s3'} or audio_reference.username or audio_reference.password or len(audio_url)>4096:
        raise ValueError('Unexpected provider audio reference')
    image=os.getenv('DID_PRESENTER_IMAGE_URL','https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png')
    # Source URL is operator configuration, never browser-supplied.
    parsed=urlsplit(image)
    if parsed.scheme!='https' or parsed.username or parsed.password:
        raise ValueError('Presenter must be an HTTPS provider-approved image')
    response=client.post('https://api.d-id.com/talks',headers=auth,json={
        'source_url':image,'script':{'type':'audio','audio_url':audio_url}})
    response.raise_for_status()
    identifier=response.json()['id']
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,180}',identifier):
        raise ValueError('Invalid provider job identifier')
    return identifier


def download_talk(client, job, target):
    key=os.environ['DID_API_KEY'].strip()
    auth={'Authorization':key if key.startswith('Basic ') else 'Basic '+key}
    deadline=time.monotonic()+600
    while time.monotonic()<deadline:
        response=client.get('https://api.d-id.com/talks/'+job,headers=auth)
        response.raise_for_status(); data=response.json()
        if data['status']=='done':
            hosts={h.strip() for h in os.getenv('DID_RESULT_HOSTS','result.d-id.com').split(',') if h.strip()}
            url=approved_https(data['result_url'],hosts)
            temporary=target.with_suffix('.part')
            try:
                with client.stream('GET',url) as stream:
                    stream.raise_for_status()
                    total=0
                    with temporary.open('xb') as output:
                        for chunk in stream.iter_bytes():
                            total+=len(chunk)
                            if total>80_000_000:raise ValueError('Video exceeds local size limit')
                            output.write(chunk)
                if total<32:raise ValueError('Empty video result')
                with temporary.open('rb') as content:
                    if b'ftyp' not in content.read(64):raise ValueError('Expected MP4 video')
                temporary.replace(target)
            finally:
                temporary.unlink(missing_ok=True)
            return
        if data['status'] in {'error','failed','rejected'}:
            raise ValueError('Provider could not generate this video')
        time.sleep(5)
    raise TimeoutError('Provider rendering timed out')


def render(db, channel, identifier, force=False):
    item=permitted_item(db,channel,identifier)
    if credentials():raise ValueError('Configure server environment variables: '+', '.join(credentials()))
    digest=fingerprint(item)
    existing=db.scalar(select(AvatarVideo).where(AvatarVideo.channel==channel,AvatarVideo.item_id==identifier,
        AvatarVideo.fingerprint==digest,AvatarVideo.status.in_(['ready','rendering'])).order_by(AvatarVideo.created_at.desc()).limit(1))
    if existing and not force:
        return existing
    key=uuid4().hex if force else sha256((channel+'|'+identifier+'|'+digest).encode()).hexdigest()[:32]
    row=AvatarVideo(id=key,channel=channel,item_id=identifier,fingerprint=digest,status='rendering')
    db.add(row);db.commit()
    MEDIA.mkdir(parents=True,exist_ok=True)
    try:
        with httpx.Client(timeout=90,follow_redirects=False,trust_env=False) as client:
            script='I am an AI-generated presenter. '+item['spoken_text']
            audio=generate_audio(client,script)
            row.provider_job_id=create_talk(client,audio);db.commit()
            download_talk(client,row.provider_job_id,MEDIA/(row.id+'.mp4'))
        # Source permissions/content may have changed during provider rendering.
        db.expire_all()
        current=permitted_item(db,channel,identifier)
        if fingerprint(current)!=digest:raise ValueError('Evidence changed during rendering')
        row.status='ready';db.add(AuditLog(actor='trusted avatar generator',action='avatar-video-ready',target=row.id,
            reason='OpenAI narration and D-ID generated presenter video; explicit AI disclosure included.'))
        db.commit()
    except Exception as error:
        db.rollback();row=db.get(AvatarVideo,row.id);row.status='failed';row.error_code=type(error).__name__;db.commit()
        (MEDIA/(row.id+'.mp4')).unlink(missing_ok=True)
        raise
    return row


@router.get('')
def status(channel: str=Query(...,pattern=r'^(markets|innovation|demo)$'),
           identifier: str=Query(...,min_length=1,max_length=180),db:Session=Depends(get_db)):
    try:item=permitted_item(db,channel,identifier)
    except HTTPException:
        return {'status':'unavailable','video_url':None}
    row=db.scalar(select(AvatarVideo).where(AvatarVideo.channel==channel,AvatarVideo.item_id==identifier,
        AvatarVideo.fingerprint==fingerprint(item)).order_by(AvatarVideo.created_at.desc()).limit(1))
    state=row.status if row else 'not_generated'
    if row and state=='ready' and not (MEDIA/(row.id+'.mp4')).is_file():state='unavailable'
    return {'status':state,'video_url':'/api/avatar-video/file?id='+row.id if row and state=='ready' else None,
            'disclosure':'AI-generated presenter video · OpenAI voice + D-ID animation · Not a live person'}


@router.get('/file/{identifier}')
def video_file(identifier:str,db:Session=Depends(get_db)):
    if not re.fullmatch(r'[a-f0-9]{32}',identifier):raise HTTPException(404,'Video unavailable')
    row=db.get(AvatarVideo,identifier)
    if not row or row.status!='ready':raise HTTPException(404,'Video unavailable')
    try:item=permitted_item(db,row.channel,row.item_id)
    except HTTPException:raise HTTPException(404,'Video unavailable')
    if fingerprint(item)!=row.fingerprint:raise HTTPException(404,'Video evidence changed')
    path=MEDIA/(row.id+'.mp4')
    if not path.is_file():raise HTTPException(404,'Video unavailable')
    return FileResponse(path,media_type='video/mp4',headers={'Cache-Control':'private, no-store'})


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--channel',choices=['markets','innovation','demo'],default='demo')
    parser.add_argument('--identifier',required=True)
    parser.add_argument('--force',action='store_true',help='Create another paid job even if one exists')
    args=parser.parse_args()
    try:
        with SessionLocal() as db:
            row=render(db,args.channel,args.identifier,args.force)
            print('Presenter video '+row.status+'. Local video identifier: '+row.id)
    except Exception as error:
        # Never print provider bodies, URLs, API keys or HTTP request headers.
        print('Generation did not complete ('+type(error).__name__+'). Check credentials, source permissions and provider access.')
        raise SystemExit(1)


if __name__=='__main__':main()
