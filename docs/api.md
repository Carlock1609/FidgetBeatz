# Stats endpoint contract

> **Status:** the client (`lib/stats/stats-client.ts`) and the server (`services/stats-counter/`, a Cloudflare Worker + Durable Object, ADR 0006) are both implemented and unit-tested. **The server is not deployed yet**, so with `NEXT_PUBLIC_STATS_URL` empty the footer shows the offline state. The app itself has no API routes.

The visitor counter is an external service (ADR 0006). The reference implementation is `services/stats-counter/`; its README covers local dev and deployment. Any other service that implements the contract below would also work.

## Base URL

`NEXT_PUBLIC_STATS_URL`, in production `https://stats.fidgetbeatz.com`, or `http://localhost:8787` for the local counter. A trailing slash is ignored. It is public (shipped to the browser), so it must never contain a secret.

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

## Errors

All responses are `content-type: application/json` with `cache-control: no-store`. Every status except 403 carries the CORS headers. The client treats every non-2xx response as a failure.

| Status | When                                                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| 204    | `OPTIONS` preflight from an allowed origin                                                                    |
| 400    | Body isn't `{ "tab": "<id>" }`: not JSON, larger than 256 bytes, or `tab` doesn't match `[A-Za-z0-9_-]{8,64}` |
| 403    | `Origin` header missing or not in `ALLOWED_ORIGINS`                                                           |
| 404    | Any path other than `/visit` or `/heartbeat` (a trailing slash is allowed)                                    |
| 405    | Any method other than `POST` or `OPTIONS`                                                                     |
| 429    | More than 60 requests from one IP in a minute; `Retry-After: 60`                                              |

## Server behavior (`services/stats-counter`)

- **now:** distinct `tab` ids seen in the last 60 s, held in memory only.
- **visits:** total visits, persisted. Each IP counts at most one visit a minute. A visit over that limit still returns 200 with the counts and still marks the tab active; it just isn't counted.
- **Privacy:** IPs are hashed with a salt that exists only in memory, used only for rate limiting, and dropped after about a minute. Nothing personal is stored, and there are no cookies.
- **No authentication:** the counts are public.
