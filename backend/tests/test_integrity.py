from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519, mldsa
from app.integrity import create_receipt, verify_receipt, public_keys, keygen, load_private, read_json

@pytest.fixture(scope='module')
def signer():
    pq=mldsa.MLDSA65PrivateKey.generate(); classic=ed25519.Ed25519PrivateKey.generate()
    return pq,classic,public_keys(pq,classic)

def test_real_hybrid_round_trip_and_purpose(signer):
    pq,classic,public=signer
    receipt=create_receipt({'title':'Original public news export','is_demo':True},pq,classic)
    assert verify_receipt(receipt,public)['valid']
    with pytest.raises(ValueError): verify_receipt(receipt,public,expected_purpose='release-manifest')

@pytest.mark.parametrize('mutation',['payload','digest','pq-signature','classical-signature','missing-pq','missing-classical','suite','expiry'])
def test_tampering_and_downgrade_rejected(signer,mutation):
    pq,classic,public=signer; receipt=create_receipt({'title':'Original'},pq,classic)
    if mutation=='payload': receipt['body']['payload']['title']='Attacker replacement'
    elif mutation=='digest': receipt['body']['payload_sha384']='0'*96
    elif mutation=='pq-signature': receipt['signatures']['ml_dsa_65']='AA=='
    elif mutation=='classical-signature': receipt['signatures']['ed25519']='AA=='
    elif mutation=='missing-pq': del receipt['signatures']['ml_dsa_65']
    elif mutation=='missing-classical': del receipt['signatures']['ed25519']
    elif mutation=='suite': receipt['body']['suite']='Ed25519'
    elif mutation=='expiry': receipt['body']['expires_at']='2099-01-01T00:00:00+00:00'
    with pytest.raises((ValueError,InvalidSignature)): verify_receipt(receipt,public)

def test_substituted_public_key_rejected(signer):
    pq,classic,public=signer
    other=public_keys(mldsa.MLDSA65PrivateKey.generate(),ed25519.Ed25519PrivateKey.generate())
    with pytest.raises(ValueError): verify_receipt(create_receipt({'x':1},pq,classic),other)

def test_expiry_and_future_time_rejected(signer):
    pq,classic,public=signer; now=datetime.now(timezone.utc)
    old=create_receipt({'x':1},pq,classic,now=now-timedelta(days=2))
    future=create_receipt({'x':1},pq,classic,now=now+timedelta(hours=1))
    for receipt in [old,future]:
        with pytest.raises(ValueError): verify_receipt(receipt,public,now=now)

def test_key_storage_encrypted_no_overwrite_and_wrong_password(tmp_path):
    password=b'long test passphrase with entropy'
    public=keygen(tmp_path,password)
    assert b'ENCRYPTED PRIVATE KEY' in (tmp_path/'ml-dsa-65.private.pem').read_bytes()
    pq,classic=load_private(tmp_path,password)
    assert public_keys(pq,classic)==public
    with pytest.raises(ValueError): load_private(tmp_path,b'wrong password')
    with pytest.raises(ValueError): keygen(tmp_path,password)

def test_ambiguous_json_and_nonfinite_payload_rejected(tmp_path,signer):
    path=tmp_path/'duplicate.json';path.write_text('{"a":1,"a":2}')
    with pytest.raises(ValueError): read_json(path)
    pq,classic,_=signer
    with pytest.raises(ValueError): create_receipt({'bad':float('nan')},pq,classic)

def test_export_snapshot_obeys_publication_gate(session):
    from sqlalchemy import select
    from app.models import Source
    from app.integrity import snapshot
    source=session.scalar(select(Source).where(Source.domain=='example.org'))
    old=source.permission.status
    try:
        assert snapshot()['articles']
        source.permission.status='blocked';session.commit()
        assert snapshot()['articles']==[]
    finally:
        source.permission.status=old;session.commit()

def test_release_file_seal_rejects_artifact_changes(tmp_path,signer):
    from app.integrity import file_manifest, verify_file_receipt
    pq,classic,public=signer
    artifact=tmp_path/'release.zip';artifact.write_bytes(b'original source package')
    receipt=create_receipt(file_manifest(artifact),pq,classic,purpose='release-manifest')
    assert verify_file_receipt(receipt,public,artifact)['file_integrity_verified']
    artifact.write_bytes(b'modified source package')
    with pytest.raises(ValueError): verify_file_receipt(receipt,public,artifact)
