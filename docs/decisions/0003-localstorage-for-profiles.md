# 0003 — localStorage with a versioned, validated schema for profiles

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Users keep up to five boards across sessions without an account. Data is small (a few KB).

## Options considered

1. **Database + auth** — out of scope and adds cost.
2. **IndexedDB** — async, more capacity; unnecessary for a few KB and complicates first paint.
3. **localStorage, single versioned JSON blob, Zod-validated on read** — synchronous read on mount, simple, atomic writes.

## Decision

Option 3. Key `fidgetbeatz:v1`, `version` field, step-wise migrations, Zod validation, backup-before-reset on corrupt data. Access goes through a `ProfileStore` interface in `lib/storage` so a cloud implementation can replace it later.

## Consequences

- Data is per-browser and can be cleared by the user or browser (e.g. Safari's storage eviction for sites not visited in a while). Acceptable for Phase 1; mention it in the UI help text.
- Not secure storage — nothing sensitive is stored.
- Export/import of profiles as a file is a cheap future mitigation if users ask.
