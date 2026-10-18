import os
import subprocess
import sys
import pytest

@pytest.mark.parametrize('changes',[
    {'DATABASE_URL':'sqlite:///unsafe.db'},
    {'CORS_ORIGINS':'http://insecure.invalid'},
    {'ALLOWED_HOSTS':'*'},
])
def test_production_rejects_unsafe_config(changes):
    env={**os.environ,'APP_ENV':'production','DATABASE_URL':'postgresql://operator:strong-fixture-password@db/news',
         'OWNER_SITE_ORIGIN':'https://news.invalid','CORS_ORIGINS':'https://news.invalid','ALLOWED_HOSTS':'news.invalid',**changes}
    result=subprocess.run([sys.executable,'-c','import app.settings'],env=env,capture_output=True,timeout=15)
    assert result.returncode!=0
    assert b'ValueError' in result.stderr
