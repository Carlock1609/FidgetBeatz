# Stats endpoint contract

> **Status:** the client side is implemented (`lib/stats/stats-client.ts`). **No provider is deployed yet** — ADR 0006's provider choice is still open — so with `NEXT_PUBLIC_STATS_URL` empty the footer shows the offline state. The app itself has no API routes.

The visitor counter is an external service (ADR 0006). Any provider or small serverless function that implements the contract below works.

## Base URL

`NEXT_PUBLIC_STATS_URL`, e.g. `https://stats.example.workers.dev`. A trailing slash is ignored. It is public (shipped to the browser), so it must never contain a secret.

## Endpoints

Both endpoints are `POST` with a JSON body and return the same JSON shape.

| Endpoint          | When the client calls it                            | Server effect                                |
| ----------------- | --------------------------------------------------- | -------------------------------------------- |
| `POST /visit`     | Once per page load (retried until it succeeds once) | Increment total visits; mark this tab active |
| `POST /heartbeat` | Every 30 s while the tab is visible                 | Mark this tab active                         |

**Request body**

```json
{ "tab": "3f1c…" }
```

`tab` is a random id generated per page load and held in memory only. It is not stored in a cookie or localStorage, and it identifies no person. The server counts a tab as "now" for ~60 s after its last request.

**Response — 200**

```json
{ "now": 12, "visits": 1284 }
```

| Field    | Type                | Meaning                              |
| -------- | ------------------- | ------------------------------------ |
| `now`    | non-negative number | Tabs active in roughly the last 60 s |
| `visits` | non-negative number | Total page visits                    |

## Client behavior and validation

- Requests are sent with `credentials: "omit"` (no cookies). The server must allow CORS from the app's origin for `POST` with `content-type: application/json`.
- Any non-2xx status, network error or malformed body (missing, negative or non-numeric fields) counts as a failure. The footer then shows `— jamming now · — visits` with a grey dot.
- On failure the client retries with exponential backoff: 30 s, 60 s, 120 s … capped at 5 minutes. It logs nothing to the console.
- Heartbeats stop while the tab is hidden and resume when it's visible again.
- Stats start after first paint (`requestIdleCallback`) and never touch the audio path.

## Server requirements (for whoever implements it)

- Rate-limit per IP at the provider (e.g. at most 1 visit per IP per minute) so the counter can't be inflated cheaply.
- Store no IPs or personal data beyond what the provider needs transiently for rate limiting.
- No authentication: the counts are public.
