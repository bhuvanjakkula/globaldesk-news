# GlobalDesk cover and customer accounts

The homepage opens directly to the news dashboard. Dr. Bhuvan Jakkula's Editor
and Founder credit appears beside the GlobalDesk title across the website.
Sign-up/sign-in remain available at `/account/access#signup` and
`/account/access#signin`. Customer support is `globalnewsbhuvanjakkula@gmail.com`.
The newsroom is also available at `/news`; no cover or account step blocks access.

Customers can register with email, a password of 12–128 characters and a mobile
number including its international country code. Email addresses are normalized;
mobile formatting is normalized and validated. Registration signs the reader in.
Passwords use individually salted scrypt hashes. Only hashed expiring session
tokens are stored. The website uses HttpOnly, SameSite cookies, trusted-origin
checks and bounded requests. Authentication attempts have a per-process budget.
Account details are private to the signed-in reader. Sign-out revokes the session.

Customer credentials never grant owner privileges. The existing owner account
continues to use its separate sign-in/session flow. Owner sessions survive the
website update. No password or payment entitlement messaging is shown there.

This is local authentication. Email/mobile ownership verification, recovery email,
SMS, production identity and distributed authentication rate limiting are not
implemented. Support links open the visitor's email application; messages are not
sent by the website. Customer mobile numbers are sensitive database records and
must be included in access-controlled backup and data-retention procedures.

Migration: `0007_reader_accounts`. Verification: 73 backend tests passed;
production build passed; five website-level HTTP checks cover signup, cookie
protection, profile, sign-out, sign-in and origin rejection. The fixture customer
and its sessions were removed afterward. See `ACCOUNT_HTTP_VERIFICATION.json`.
