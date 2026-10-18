"""Offline hybrid integrity receipts; both signatures and a trusted public key required."""
import argparse
import base64
from datetime import datetime, timedelta, timezone
from hashlib import sha384
import json
import os
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa

SUITE = 'ML-DSA-65+Ed25519'
SCHEMA = 'globaldesk-integrity-v1'
CONTEXT = b'GlobalDesk/Integrity/v1'
MAX_BYTES = 2 * 1024 * 1024

def canonical(value):
    # Application-specific deterministic UTF-8 JSON, not an RFC 8785 implementation.
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode('utf-8')

def b64(value): return base64.b64encode(value).decode('ascii')
def unb64(value): return base64.b64decode(value, validate=True)
def fingerprint(public): return sha384(canonical(public)).hexdigest()

def public_keys(pq, classic):
    return {'suite':SUITE,'ml_dsa_65':b64(pq.public_key().public_bytes_raw()),
            'ed25519':b64(classic.public_key().public_bytes_raw())}

def create_receipt(payload, pq, classic, *, purpose='news-export', lifetime_hours=24, now=None):
    if purpose not in {'news-export','release-manifest','self-test'}: raise ValueError('Unsupported purpose')
    if not 1<=lifetime_hours<=168: raise ValueError('Expiry must be 1–168 hours')
    if len(canonical(payload))>MAX_BYTES: raise ValueError('Payload exceeds 2 MiB')
    now=now or datetime.now(timezone.utc)
    public=public_keys(pq,classic)
    body={'schema':SCHEMA,'suite':SUITE,'key_id':fingerprint(public),'purpose':purpose,
          'created_at':now.isoformat(),'expires_at':(now+timedelta(hours=lifetime_hours)).isoformat(),
          'payload_sha384':sha384(canonical(payload)).hexdigest(),'payload':payload}
    message=CONTEXT+b'\x00'+canonical(body)
    return {'body':body,'signatures':{'ml_dsa_65':b64(pq.sign(message,CONTEXT)),
                                    'ed25519':b64(classic.sign(message))}}

def verify_receipt(receipt, trusted_public, *, expected_purpose='news-export', now=None):
    if set(receipt)!={'body','signatures'} or trusted_public.get('suite')!=SUITE:
        raise ValueError('Unsupported receipt or public key suite')
    body=receipt['body']; signatures=receipt['signatures']
    if set(body)!={'schema','suite','key_id','purpose','created_at','expires_at','payload_sha384','payload'}:
        raise ValueError('Invalid receipt fields')
    if body['schema']!=SCHEMA or body['suite']!=SUITE or set(signatures)!={'ml_dsa_65','ed25519'}:
        raise ValueError('Both required algorithms must be present')
    if body['key_id']!=fingerprint(trusted_public): raise ValueError('Untrusted key fingerprint')
    if body['purpose']!=expected_purpose: raise ValueError('Receipt purpose mismatch')
    message=CONTEXT+b'\x00'+canonical(body)
    if len(message)>MAX_BYTES+8192: raise ValueError('Receipt exceeds limit')
    mldsa.MLDSA65PublicKey.from_public_bytes(unb64(trusted_public['ml_dsa_65'])).verify(unb64(signatures['ml_dsa_65']),message,CONTEXT)
    ed25519.Ed25519PublicKey.from_public_bytes(unb64(trusted_public['ed25519'])).verify(unb64(signatures['ed25519']),message)
    if body['payload_sha384']!=sha384(canonical(body['payload'])).hexdigest(): raise ValueError('Payload digest mismatch')
    created=datetime.fromisoformat(body['created_at']); expires=datetime.fromisoformat(body['expires_at'])
    if created.tzinfo is None or expires.tzinfo is None: raise ValueError('Timezone required')
    now=now or datetime.now(timezone.utc)
    if created>now+timedelta(minutes=5) or expires<=now or not timedelta(0)<expires-created<=timedelta(hours=168):
        raise ValueError('Receipt expired or invalid validity interval')
    return {'valid':True,'suite':SUITE,'key_id':body['key_id'],'purpose':body['purpose'],
            'expires_at':body['expires_at'],'payload_sha384':body['payload_sha384']}

def read_json(path):
    path=Path(path)
    if path.stat().st_size>MAX_BYTES+32768: raise ValueError('File exceeds verification size limit')
    def no_duplicates(pairs):
        result={}
        for key,value in pairs:
            if key in result: raise ValueError('Duplicate JSON key')
            result[key]=value
        return result
    return json.loads(path.read_text(encoding='utf-8-sig'),object_pairs_hook=no_duplicates,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Nonfinite JSON number')))

def write_new(path,data,private=False):
    descriptor=os.open(str(path),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600 if private else 0o644)
    with os.fdopen(descriptor,'wb') as stream: stream.write(data)

def keygen(directory,password):
    if len(password)<20: raise ValueError('Use a strong passphrase of at least 20 bytes')
    directory=Path(directory); directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    paths=[directory/'ml-dsa-65.private.pem',directory/'ed25519.private.pem',directory/'public.json']
    if any(p.exists() for p in paths): raise ValueError('Refusing to overwrite existing key material')
    pq=mldsa.MLDSA65PrivateKey.generate();classic=ed25519.Ed25519PrivateKey.generate()
    for key,path in zip([pq,classic],paths):
        write_new(path,key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,
                                        serialization.BestAvailableEncryption(password)),private=True)
    public=public_keys(pq,classic);write_new(paths[2],canonical(public))
    return public

def load_private(directory,password):
    keys=[]
    for name,kind in [('ml-dsa-65',mldsa.MLDSA65PrivateKey),('ed25519',ed25519.Ed25519PrivateKey)]:
        path=Path(directory)/f'{name}.private.pem'
        if path.stat().st_size>32768: raise ValueError('Invalid private key file')
        key=serialization.load_pem_private_key(path.read_bytes(),password=password)
        if not isinstance(key,kind): raise ValueError('Private key algorithm mismatch')
        keys.append(key)
    return keys

def snapshot():
    # Reuse the public API's publication predicates. No pending/private records exported.
    from .db import SessionLocal
    from .main import news
    with SessionLocal() as db:
        page=news(category=None,country=None,source=None,q=None,language=None,date_from=None,date_to=None,page=1,page_size=48,db=db)
        return {'kind':'public-news-snapshot','selection':'latest 48 permitted listings','total_available':page.total,
                'articles':[a.model_dump(mode='json') for a in page.items]}

def file_manifest(path):
    path=Path(path)
    digest=sha384(); size=0
    with path.open('rb') as stream:
        while chunk:=stream.read(1024*1024):
            digest.update(chunk);size+=len(chunk)
    return {'kind':'release-manifest','file_name':path.name,'size':size,'sha384':digest.hexdigest()}

def verify_file_receipt(receipt,trusted_public,path):
    result=verify_receipt(receipt,trusted_public,expected_purpose='release-manifest')
    if receipt['body']['payload']!=file_manifest(path): raise ValueError('Release file differs from signed manifest')
    return {**result,'file_integrity_verified':True}

def main():
    parser=argparse.ArgumentParser(description='Offline hybrid post-quantum integrity receipts; not transport encryption')
    sub=parser.add_subparsers(dest='command',required=True)
    create=sub.add_parser('keygen');create.add_argument('--directory',required=True)
    sign=sub.add_parser('snapshot');sign.add_argument('--directory',required=True);sign.add_argument('--output',required=True)
    seal=sub.add_parser('seal-file');seal.add_argument('--directory',required=True);seal.add_argument('--input',required=True);seal.add_argument('--output',required=True)
    verify=sub.add_parser('verify');verify.add_argument('--receipt',required=True);verify.add_argument('--trusted-public',required=True)
    verify.add_argument('--file',help='Required release artifact when verifying release-manifest purpose')
    verify.add_argument('--purpose',choices=['news-export','release-manifest','self-test'],default='news-export')
    args=parser.parse_args()
    try:
        if args.command=='verify':
            if args.purpose=='release-manifest':
                if not args.file: raise ValueError('Release artifact --file is required')
                result=verify_file_receipt(read_json(args.receipt),read_json(args.trusted_public),args.file)
            else:
                result=verify_receipt(read_json(args.receipt),read_json(args.trusted_public),expected_purpose=args.purpose)
        else:
            password=os.environ.get('GLOBALDESK_KEY_PASSWORD','').encode()
            if not password: raise ValueError('Set GLOBALDESK_KEY_PASSWORD in this private shell; never pass secrets on the command line')
            if args.command=='keygen': result={'key_id':fingerprint(keygen(args.directory,password)),'suite':SUITE}
            else:
                pq,classic=load_private(args.directory,password)
                receipt=create_receipt(file_manifest(args.input),pq,classic,purpose='release-manifest') if args.command=='seal-file' else create_receipt(snapshot(),pq,classic)
                write_new(args.output,canonical(receipt))
                result={'written':str(args.output),'key_id':receipt['body']['key_id'],'suite':SUITE}
        print(json.dumps(result,indent=2))
    except Exception as exc:
        # No payloads, passwords or key contents in CLI failures.
        parser.exit(1,f'Integrity operation failed ({type(exc).__name__}). Check inputs, trusted keys and validity.\n')

if __name__=='__main__': main()
