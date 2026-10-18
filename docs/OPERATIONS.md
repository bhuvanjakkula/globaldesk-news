# GlobalDesk operations

## Private Editorial Desk

Sign in through `/owner`, then open `/editorial`. The dashboard lists stored
stories, registered sources, rights expiry, the last 20 discovery runs and the
last 50 audit entries. Story listings are paginated in batches of 50. The source
list is bounded to 500 entries. Mutations require the existing owner session,
trusted origin and an explanation of at least 12 non-whitespace characters.
Actor identity comes from the authenticated session. No HTTP approval endpoint
is exposed. Withdrawal and source blocking use the same audited operator logic
as the CLI. Blocking immediately removes the source from all public views.

## Rights renewal

`python -m app.approve_source` accepts `--expires-at 2027-01-01T00:00:00Z`.
Use the actual agreement's expiry and existing required reviewer, basis and
rights confirmation flags. A missing expiry means none was recorded; it is not
evidence of perpetual rights. Existing permissions retain their prior scope.
Expired permissions are checked at request time in archive, source listing,
filters, detail, briefing, intelligence, watch and comparison/research queries.
Ingestion stages records rather than publishing when rights have expired.
Renewal requires the trusted approval CLI and new documented review.
Expiry is visible in the dashboard; external renewal messages are not sent.

## Discovery monitoring

Apply migration `0006_operations` before running workers. Every invocation of
`python -m app.ingest` (including disabled runs) records its start, finish and
per-section result. Failures in one section do not prevent the other sections
from running. History retains 200 completed or interrupted runs, pruned when a
run finishes. An unfinished `running` row means the process may have crashed;
check the worker logs rather than assuming success. The dashboard exposes the
latest 20 runs only to the owner. Discovery remains opt-in and disabled locally.
This history does not replace infrastructure monitoring or distributed locks.

## SQLite backup and recovery

From `backend/`, with the virtual environment activated:

```powershell
New-Item -ItemType Directory -Force ../backups
python -m app.backup backup --destination ../backups/globaldesk-20261017.db
python -m app.backup check --source ../backups/globaldesk-20261017.db
python -m app.backup restore --source ../backups/globaldesk-20261017.db --destination ./recovered.db
```

The tool uses SQLite's online backup API, checks database integrity and the
expected project tables, and refuses to overwrite an existing destination.
Restores always create a separate file. Stop API/worker processes, point
`DATABASE_URL` to the recovered file, migrate and check it before restarting.
Keep the original until recovery is accepted. Backups contain private notes,
owner token hashes and audit records: restrict access, encrypt off-device copies
and keep them out of source releases. Session revocation after an older restore
is recommended because old credential state is restored too.

For PostgreSQL use the deployment's `pg_dump`/`pg_restore` into a separate test
database and verify migrations, counts, visibility and owner access there.
PostgreSQL recovery and Redis/Celery container execution have not been verified
on this machine. Docker is not installed here.

## Local verification

```powershell
cd backend
python -m pytest -q -p no:cacheprovider --basetemp=.test-tmp-new
cd ../frontend
$env:NEXT_BUILD_DIR='.next-local'
npm run build
npm run start -- --hostname 127.0.0.1
```

Use a new temporary/build directory if OneDrive locks an older output. Keep
`NEXT_BUILD_DIR` the same when building and starting. Docker uses the default
`.next` path. On this Windows host, tests require permission to open Python's
local loopback sockets. This does not imply the tests call external services.

## External launch dependencies

The local software still uses explicitly fictional fixtures. Public deployment
requires the actual hosting account/domain, HTTPS, publisher feed access and
documented rights, real operator contact and production editorial/privacy terms.
Production identity, email delivery, billing, multilingual interfaces, reviewed
AI summaries and persistent editorial event clusters remain separate roadmap
features. They are not represented as completed by this release.
