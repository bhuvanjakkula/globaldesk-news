# Passwordless owner access — v0.6

Owner: **bhuvanjakkula@gmail.com**. Owner access is free, with no password, card, subscription or paid email service. The current website has no billing integration. This change adds an authenticated private workspace and a server-defined owner entitlement; it does not bypass a third-party payment service.

## Using it on your trusted computer

Start the API and website using the existing launcher. Then run this in the project folder:

```powershell
./Open-Owner.ps1
```

It opens a fresh one-time link in your default browser. Click **Continue as owner**. The resulting owner session lasts 12 hours. You can return to `http://127.0.0.1:3000/owner` while that browser session is valid. Generate another link when it expires. The launcher requires trusted filesystem/database access and the installed backend virtual environment. It does not start the services itself.

`./Open-Owner.ps1 -PrintLink` prints the private link for opening in another browser. Treat it as a temporary credential; do not share it. The token is carried in the URL fragment so it is not sent in HTTP URL requests, and the page removes it from the address bar before redemption. Issuing a new link cancels any older unused links.

## Security model

This is **trusted-server-issued access**, not email ownership verification. Nobody can unlock the owner account by typing the email address. There is no public endpoint that issues links and no sign-in email is sent. Only a trusted local operator with project/database access can issue the link. A remote Gmail/Google login or email-delivery provider would be a separate integration.

Links contain 256 bits of cryptographic randomness, expire after 10 minutes and are atomically single-use. Only SHA-256 token digests are stored. Sessions use separate random tokens, expire after 12 hours and can be revoked. Browser cookies are HttpOnly and SameSite=Strict; Secure is enabled for HTTPS origins. Local HTTP is suitable only for this local demo.

The two new POST endpoints are limited to owner session redemption/logout, check explicit origins and accept no more than 4 KiB of streamed body data. Public news endpoints remain read-only. The website server holds the API session token in a protected cookie and does not return it in the browser sign-in response body. The owner page and related endpoints use no-store responses.

The private workspace shows your email, free entitlement, links to implemented features, stored listing/source counts and recent operator activity. This is not a new web editorial dashboard: existing publication/rights changes remain private CLI operations.

## Revoke sessions

Sign out from the owner page to revoke that browser session. To revoke every owner session and pending link, run this from `backend`:

```powershell
./.venv/Scripts/python.exe -m app.owner_access revoke-all
```

For another fresh link without the desktop launcher:

```powershell
./.venv/Scripts/python.exe -m app.owner_access issue
```

Apply migration `0003_owner_access` when installing this update. In Docker, run `docker compose exec api python -m app.owner_access issue` after migrations have completed. Set `OWNER_SITE_ORIGIN` to the actual HTTPS website origin in production and in the frontend runtime environment. `OWNER_EMAIL` is operator configuration, not user-submitted authorization. Protect the database, local machine and terminal; possession of a valid link or session token grants owner access until revoked/expired. There is no automatic durable revocation service or hardware identity binding.

## Verification

48 backend tests and the production build passed. New tests cover email-only attempts, hashed storage, free entitlement, expired links/sessions, link rotation, single use, concurrent redemption, origin rejection, request size limits and logout revocation. End-to-end website checks verified protected cookies, absence of session tokens in response JSON, successful sign-in, rejected replay and logout. See `OWNER_ACCESS_VERIFICATION.json`. No email was sent and no payment service was used.
