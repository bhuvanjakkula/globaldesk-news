# Wall Street & Global Exchanges — v0.12

`/markets` adds a dedicated finance section with a homepage gateway and navigation
entry. It includes a Wall Street panel linking NYSE and Nasdaq, official finance
headlines, topic/search/region/date filters, exchange discovery, local clocks and
browser-saved favourites. Account sign-in is not required to read this section.

## News sources and scope

- U.S. Securities and Exchange Commission press releases. Government-created
  content is reusable according to the SEC webmaster FAQ:
  https://www.sec.gov/files/about/webmaster-faq.htm
  Feed directory: https://www.sec.gov/about/rss-feeds
- Federal Reserve Board government press releases, title/link metadata only:
  https://www.federalreserve.gov/feeds/feeds.htm
  https://www.federalreserve.gov/disclaimer.htm
- European Central Bank press-release titles and links, accurately attributed.
  No authored speeches, working papers or occasional papers are imported.
  ECB information remains freely available at its original website:
  https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html
  https://www.ecb.europa.eu/home/html/rss.en.html

These primary-source announcements cover regulation, investor protection, funds,
rates, banking and economic policy. They do not constitute independent exchange
reporting, earnings-news coverage, market prices or trading recommendations.
No article bodies, images, logos or summaries are republished. Source permission
blocks/expiry are enforced on import and every public read. Existing source
permissions are never reset. Topic labels are deterministic headline matches.

## Exchange directory

Twelve official gateways: NYSE, Nasdaq, LSE, Euronext, JPX, HKEX, NSE, BSE, SGX,
ASX, JSE and B3. The five directory regions are Americas, Europe, Asia, Africa
and Oceania. Links are discovery resources, not exchange partnerships.

Clocks use browser Intl time zones and the device clock, including daylight-saving
rules. They display city time only; they do not model holidays, trading breaks,
extended sessions or open/closed status. Euronext's displayed clock is Paris time.
Favourites use only this browser's localStorage, not owner/customer account data.
If storage is blocked, favourites work only until the page reloads and a message
explains this. Stars toggle favourites, and the list can filter to saved entries.

## Investment research

The research desk links to SEC EDGAR, Investor.gov, Federal Reserve policy and
ECB press releases. These are external original resources; GlobalDesk does not
place orders, connect brokers or provide personalised investment advice. Live
quotes and broader regional newsroom feeds remain future integrations.

## Operations

Apply migration `0009_finance_signals` before use. The local database was backed
up first. From `backend/`:

```powershell
python -m app.market_ingest
python -m app.market_ingest --watch
```

Or run `./Start-GlobalDesk.ps1 -Service Markets`. Watch mode refreshes every 30
minutes while its local process runs and waits if a recent refresh already
completed. Keep one importer running. This is not an installed OS service and
does not survive shutdown automatically.

One request per feed per cycle, one-second separation, 25-second timeouts, no
redirects and a 2 MB decompressed response cap. XML entities/DOCTYPE declarations
are rejected. URLs must be HTTPS on the exact provider domain; future/invalid
dates are excluded. ECB duplicate path slashes are normalized before accepting
only `/press/pr/` links. Records deduplicate by URL hash; withdrawn rows are not
republished. The read API samples 500 records and displays up to 60. Refresh logs
use `markets-` identifiers and report partial failures per source.

Initial fetch processed 25 SEC, 20 Federal Reserve and one ECB press-release
record. Visible counts depend on selected dates and source gates. Runtime data
is excluded from source ZIPs; run the importer after installing the release.

## Validation

80 backend tests passed, covering parsing, future dates, host restrictions, ECB
paper/speech exclusion, duplicate updates, filters, permissions and withdrawal.
Production build and TypeScript passed. Browser checks validate navigation,
exchange favourites, filters and the rendered dashboard. Prior global-news
deployment limitations remain in COMPLETION_STATUS.md.
