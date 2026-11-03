# urja-web

Web client for [urja-api](../urja-api): a read-only operations console over the
Urja Meter Ops data. Every screen is built on the API's routes; nothing is
read from local files.

| Screen | Route | API routes used |
|---|---|---|
| Overview | `/` | `/v1/stats`, `/v1/stats?groupBy=zone` |
| Meters | `/meters` | `/v1/meters` (filters, facets, sort, paging; state kept in the URL) |
| Meter detail | `/meters/{id}` | `/v1/meters/{id}`, `/v1/meters/{id}/readings` (half-hourly, hourly, daily), `/v1/meters/{id}/anomalies` |
| Map & nearby | `/map` | `/v1/meters.geojson`, `/v1/meters/nearby` (click the map) |
| Network | `/network`, `/network/{nodeId}` | `/v1/hierarchy`, `/v1/hierarchy/{nodeId}` |
| Transformers | `/transformers`, `/transformers/{code}` | `/v1/transformers`, `/v1/transformers/{code}`, `/v1/transformers/{code}/load` |
| Anomalies | `/anomalies` | `/v1/anomalies` (by transformer, network node or meter IDs) |
| Data quality | `/quality` | `/v1/quality` |
| Search (header) | everywhere | `/v1/search` |
| API status (header) | everywhere | `/ready` (catalog loaded, portal circuit breaker) |

## How it talks to the API

```
Browser ──/api/urja/v1/...──▶ Next.js server (adds X-API-Key) ──▶ urja-api
```

The browser never calls urja-api directly. `app/api/urja/[...path]/route.ts`
is a small backend-for-frontend proxy:

- **The API key stays on the server.** A `NEXT_PUBLIC_` variable would be
  bundled into the JavaScript that every visitor downloads.
- **No CORS and no mixed content.** This site can run on https (Vercel) while
  the API runs on plain http (EC2): the browser only talks to this site.
- **Only GET, and only the API's read routes** (`/v1/...`, `/ready`, `/health`)
  are forwarded; anything else is a 404 from the proxy.

Errors keep the API's RFC 9457 shape end to end, so every screen shows the
status, the stable error `code`, the `requestId` (to find the log line on the
server) and, for a 503, when to retry. Freshness (`meta.asOf`, `stale`,
`source`) is shown as a badge on every page.

## Run locally

Needs Node 20+ and pnpm (`npm i -g pnpm`), and urja-api running.

```bash
cp .env.example .env.local     # set URJA_API_BASE_URL and URJA_API_KEY
pnpm install
pnpm dev                       # http://localhost:3001 (the API uses 3000)
```

`.env.local`:

```bash
URJA_API_BASE_URL=http://localhost:3000    # or http://<EC2_IP>
URJA_API_KEY=<a key from the API's API_KEYS, the part after "name:">
```

Give the web app its own key in the API (`API_KEYS=...,web:<key>`), so its
traffic shows up as `consumer: "web"` in the API logs and can be revoked on
its own.

Checks: `pnpm typecheck`, `pnpm build`.

## Deploy (Vercel, free)

1. Push this folder to its own GitHub repo.
2. vercel.com → Add New Project → import the repo (framework: Next.js).
3. Environment variables: `URJA_API_BASE_URL=http://<EC2_IP>` and
   `URJA_API_KEY=<web key>`.
4. Deploy. The site is on https; it calls the EC2 API from Vercel's servers.

## Structure

```
app/
  api/urja/[...path]/route.ts   server-side proxy (adds the key)
  page.tsx, overview-view.tsx   overview
  meters/ map/ network/ transformers/ anomalies/ quality/   one folder per screen
lib/
  api.ts        typed client, one function per API route; ApiError carries the problem+json
  types.ts      response types matching openapi.json
  useApi.ts     fetch hook: cancels stale requests, keeps old data while reloading
  useUrlState.ts  filters in the URL (shareable, survive reload)
  format.ts     IST dates, numbers, labels, colours
components/
  Shell.tsx       sidebar, global search, API status
  ui.tsx          cards, badges, error/empty/loading states, pagination, inputs
  ReadingsPanel.tsx, AnomalyList.tsx, WindowPicker.tsx, LeafletMap.tsx, MapView.tsx
```

## Notes

- Times are IST, as in the API. Energy history on the portal covers
  1–30 June 2026, so the date pickers are limited to June. The newest reading
  is 30 June 23:30, so a window that ends on 30 June is sent to the API as
  ending at 23:30; otherwise every meter would show a one-interval data gap
  that is only the end of the history.
- Map tiles come from OpenStreetMap.
