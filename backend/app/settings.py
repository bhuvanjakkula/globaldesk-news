import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./local.db')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
# Browser checks are independent of bounded upstream collection cadence.
FEED_REFRESH_SECONDS = max(60, min(int(os.getenv('FEED_REFRESH_SECONDS', '60')), 86400))
GDELT_ENABLED = os.getenv('GDELT_ENABLED', 'false').lower() == 'true'
GDELT_TIMESPAN = os.getenv('GDELT_TIMESPAN', '24h')
GDELT_MAX_RECORDS = min(max(int(os.getenv('GDELT_MAX_RECORDS', '25')), 1), 250)
GDELT_MIN_INTERVAL_SECONDS = max(float(os.getenv('GDELT_MIN_INTERVAL_SECONDS', '2')), 1)
CORS_ORIGINS = [v.strip() for v in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',') if v.strip()]

APP_ENV = os.getenv('APP_ENV', 'development')
ALLOWED_HOSTS = [v.strip() for v in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,api').split(',') if v.strip()]
API_REQUESTS_PER_MINUTE = max(10, min(int(os.getenv('API_REQUESTS_PER_MINUTE', '240')), 10000))
API_GLOBAL_REQUESTS_PER_MINUTE = max(API_REQUESTS_PER_MINUTE, min(int(os.getenv('API_GLOBAL_REQUESTS_PER_MINUTE', '2400')), 100000))
IS_VERCEL = bool(os.getenv('VERCEL')) or bool(os.getenv('VERCEL_ENV'))

OWNER_EMAIL = os.getenv('OWNER_EMAIL', 'bhuvanjakkula@gmail.com').strip().lower()

if IS_VERCEL:
    # On Vercel serverless functions, writable storage is in the system temp directory (/tmp)
    if DATABASE_URL.startswith('sqlite') and 'local.db' in DATABASE_URL:
        import shutil, tempfile
        tmp_db = Path(tempfile.gettempdir()) / 'globaldesk_local.db'
        src_db = Path(__file__).resolve().parents[1] / 'local.db'
        if not tmp_db.exists() and src_db.exists():
            try:
                tmp_db.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_db, tmp_db)
            except Exception:
                pass
        if tmp_db.exists():
            DATABASE_URL = f"sqlite:///{tmp_db.as_posix()}"

    # Vercel handles host validation and SSL termination at its edge proxy
    ALLOWED_HOSTS = ['*']
    CORS_ORIGINS = ['*']
    OWNER_SITE_ORIGIN = os.getenv('OWNER_SITE_ORIGIN', f"https://{os.getenv('VERCEL_URL', 'localhost')}")
    OWNER_ALLOWED_ORIGINS = {'*'}
else:
    if not ALLOWED_HOSTS or any('*' in host for host in ALLOWED_HOSTS):
        raise ValueError('Set an explicit ALLOWED_HOSTS list; wildcard access is not supported')
    if APP_ENV == 'production':
        if not DATABASE_URL.startswith('postgresql') or 'change-me' in DATABASE_URL:
            raise ValueError('Production requires PostgreSQL with non-default credentials')
        if not CORS_ORIGINS or any(not origin.startswith('https://') for origin in CORS_ORIGINS):
            raise ValueError('Production CORS origins must use HTTPS')

    OWNER_SITE_ORIGIN = os.getenv('OWNER_SITE_ORIGIN', 'http://127.0.0.1:3000').rstrip('/')
    OWNER_ALLOWED_ORIGINS = {OWNER_SITE_ORIGIN} | ({'http://localhost:3000', 'http://127.0.0.1:3000'} if APP_ENV != 'production' else set())
    if APP_ENV == 'production' and not OWNER_SITE_ORIGIN.startswith('https://'):
        raise ValueError('Production owner access requires an HTTPS OWNER_SITE_ORIGIN')

