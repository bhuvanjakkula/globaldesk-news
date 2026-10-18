# GlobalDesk security and post-quantum integrity — v0.5

Updated 17 October 2026. This is an engineering hardening increment, not a claim of complete security, independent certification or production readiness.

## Implemented protection

- An explicit allowed-host list rejects unexpected Host values; wildcard lists are refused. The API admits only GET, HEAD and OPTIONS and rejects request bodies, oversized queries and excessive pagination offsets.
- Per-process token buckets limit client and global request budgets; intelligence analysis costs ten units. Client tracking has a fixed 4,096-entry ceiling. Incoming request IDs are discarded and new random correlation IDs are returned. Unexpected failures return generic errors with an ID rather than exception details.
- Project launch commands disable Uvicorn proxy-header processing. Limits use the socket peer, not arbitrary forwarding headers. When deployed behind a proxy, clients may share one bucket; configure genuine client limits at the trusted edge. This is not distributed DDoS protection.
- API responses carry no-store, frame denial, MIME-sniff prevention, referrer and permission restrictions. Development documentation has an explicit CDN/inline-script policy exception; production disables documentation and OpenAPI routes.
- Next.js uses a fresh script nonce per response, strict-dynamic CSP, restricted image/connect/form origins and frame denial. Pages render dynamically so inline framework scripts receive the nonce. Inline styles remain allowed for existing artwork. HSTS is emitted only when the request scheme is HTTPS. Local HTTP is unchanged. Server API fetches have an eight-second timeout.
- Application container images run without root. Compose drops application capabilities, disables privilege escalation and binds website/API/database ports to loopback. Docker execution is unavailable locally, so these container settings have not been exercised.
- Production configuration rejects SQLite, the known default database credential string, HTTP CORS origins and wildcard hosts. This validation does not measure password entropy or configure HTTPS automatically.

## Post-quantum integrity seals

`backend/app/integrity.py` implements offline signed public-news snapshots. It uses the installed `cryptography` implementation of **ML-DSA-65** and **Ed25519**, independently signs the same versioned statement with both keys, and requires both signatures during verification. ML-DSA is standardized in [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final); the [library documentation](https://cryptography.io/en/50.0.0/hazmat/primitives/asymmetric/mldsa/) describes its API. This application's dual-signature envelope is a custom protocol and has not had independent cryptographic review.

The signed statement binds the suite, schema, purpose, public-key fingerprint, SHA-384 payload digest, creation time and expiry. Serialization is explicitly application-specific deterministic ASCII JSON, not an implementation of RFC 8785. Duplicate JSON object keys and nonfinite numbers are rejected by the CLI. Files and receipts are size-bounded. Receipts default to 24 hours, support at most seven days, and reject creation times over five minutes ahead. A trustworthy local verifier clock is required.

Private keys use encrypted PKCS#8 storage with a passphrase supplied through a private-shell environment variable. Key generation refuses overwrites. POSIX permissions are requested; **Windows inherited ACLs still require operator review**. Passwords and key contents are not printed. Production custody, rotation, revocation, HSM/KMS integration and recovery must be designed before operational signing. There is no public HTTP signing endpoint and the website has no production private key.

The verifier requires a public key from an independently trusted channel. A self-signed receipt plus an attacker-supplied key does not prove publisher identity. A signature detects changes and authenticates possession of the pinned key; it does not establish factual accuracy, publisher rights, confidential storage or source independence. A still-valid receipt may be replayed: there is no monotonic checkpoint, online revocation service or trusted timestamp authority.

**No ML-KEM or post-quantum TLS transport is implemented.** Signed snapshots are readable JSON, not encrypted archives. The current website still runs over local HTTP. FIPS-standard algorithm selection does not mean this application or its cryptographic module is FIPS validated.

## Operator workflow

From the backend directory, with dependencies installed. Select a protected key directory outside the repository for real use; do not reuse test keys. In a private PowerShell shell:

```powershell
$signingDirectory = Join-Path $env:LOCALAPPDATA 'GlobalDeskSigning'
$signingPassword = Read-Host 'Strong signing passphrase, at least 20 characters' -AsSecureString
$env:GLOBALDESK_KEY_PASSWORD = [System.Net.NetworkCredential]::new('', $signingPassword).Password
try {
    .\.venv\Scripts\python.exe -m app.integrity keygen --directory $signingDirectory
    .\.venv\Scripts\python.exe -m app.integrity snapshot --directory $signingDirectory --output public-news-receipt.json
} finally {
    Remove-Item Env:\GLOBALDESK_KEY_PASSWORD -ErrorAction SilentlyContinue
}
```

Keep the private keys encrypted and restrict filesystem access. Environment variables are visible to sufficiently privileged local processes; production should use managed signing infrastructure. The snapshot contains the latest 48 publicly permitted listings and records the total available count. Supply a new output filename for each export; files are never overwritten by the CLI.

Distribute and validate the public-key fingerprint through a separately authenticated channel, then verify offline:

```powershell
.\.venv\Scripts\python.exe -m app.integrity verify --receipt public-news-receipt.json --trusted-public trusted-public.json
```

`trusted-public.json` must be a key you have already authenticated. Do not accept a new key solely because it arrived with the receipt. The default verifier purpose is `news-export`; mismatched purposes are rejected.

## Evidence from this delivery

- 42 backend tests passed, including real ML-DSA/Ed25519 sign/verify, either-signature corruption, downgrade, payload mutation, substituted keys, validity, encrypted key loading, no-overwrite, export permission filtering, request limits, generic errors and unsafe production configuration rejection.
- Frontend production build and TypeScript passed; six HTTP routes verified matching nonces on every script tag and fresh nonce values between responses.
- Browser checked the Security page, real runtime crypto self-test and navigation to/from Intelligence Lab at a narrow viewport. This is not an exhaustive accessibility review or penetration test.
- `FRONTEND_DEPENDENCY_AUDIT.json`: npm reports zero known advisories in the installed dependency tree.
- `BACKEND_DEPENDENCY_AUDIT.json`: pip-audit reports zero known advisories for the current requirements resolution.
- `BACKEND_INSTALLED_AUDIT.json`: pip-audit reports zero known advisories for 47 installed runtime dependencies recorded in `BACKEND_INSTALLED_REQUIREMENTS.txt`. This is a Windows runtime inventory, not a portable Docker lockfile. Advisories change; audits are point-in-time and do not prove absence of vulnerabilities.
- `PQC_CLI_VERIFICATION.json`: real CLI key generation, public snapshot signing, both-signature verification and tamper rejection passed using ephemeral demonstration keys. Private demo keys were removed; only `PQC_DEMO_PUBLIC.json` and `PQC_DEMO_RECEIPT.json` are retained. The demo receipt expires on 18 October 2026 at approximately 08:37 IST; verification correctly fails after expiry. These demo artifacts establish no production identity.

## Remaining production controls

Provision a deployment account, domain and trusted HTTPS termination, then verify the actual negotiated protocols before making PQC transport claims. Enforce client limits and request-size/time limits at the edge; secure secrets and database access; test PostgreSQL migrations, restoration and permission revocation; monitor errors and ingestion freshness; schedule dependency patching and commission independent review. The authenticated editorial dashboard and accounts remain unimplemented. Existing publisher permissions and fictional-content restrictions remain in force.


## Software release integrity

The same offline engine can seal a ZIP or other artifact by streaming its SHA-384 digest into a signed release manifest. Verifying a release requires both signatures **and** matching artifact filename, byte count and digest:

```powershell
.\.venv\Scripts\python.exe -m app.integrity seal-file --directory $signingDirectory --input GlobalDesk-v0.5-security-source.zip --output release-receipt.json
.\.venv\Scripts\python.exe -m app.integrity verify --receipt release-receipt.json --trusted-public trusted-public.json --purpose release-manifest --file GlobalDesk-v0.5-security-source.zip
```

Run signing in a private shell with the passphrase configured as described above. Detached `GlobalDesk-v0.5-security-source.receipt.json` and `.public.json` alongside this delivery demonstrate the release workflow with an ephemeral test identity. They provide a verification fixture, not a production publisher identity; independently authenticate the public-key fingerprint before relying on any real release. The receipt expires 24 hours after generation. Private demo keys are not distributed.


## v0.6 Owner access amendment

The news API remains read-only; two strictly scoped owner-session POST routes are now available with explicit-origin checks and streamed 4 KiB body limits. Private owner access uses trusted-local single-use links and revocable sessions, not email ownership assertions. Owner cookies are HttpOnly/SameSite=Strict and Secure on HTTPS. See docs/OWNER_ACCESS.md. The authenticated editorial dashboard remains pending; the new owner workspace is a private status and navigation area.


## v0.7 Watch Desk amendment

Three authenticated, origin-checked watch mutation routes are added to the fixed POST allowlist. Requests remain capped at 4 KiB, private reports/review actions cost ten budget units, and monitor identity is always derived from the authenticated owner session. Per-owner quota slots have database uniqueness/check constraints. Public news stays read-only. See docs/WATCH_DESK.md for data bounds and concurrency limitations.
