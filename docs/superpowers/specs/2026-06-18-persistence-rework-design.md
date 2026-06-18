# Persistence Rework — Local-First, No Tokens

**Date:** 2026-06-18
**Status:** Approved (design)
**Feature:** #2 of a four-feature batch (AoW scaling dropped; how-to page and build optimizer are separate specs)

## Problem

Cross-device progress sync currently requires the user to create a GitHub
fine-grained personal access token and paste it into the Progress page
(`src/lib/gistSync.ts`, 334 lines + 531-line test, plus a "Cloud sync (GitHub)"
section in `ProgressPage.tsx`). This is the single biggest usability wart: token
creation is intimidating, tokens expire, and the flow is far heavier than the
app otherwise is.

## Goal

Make persistence "just work" with **zero accounts and zero tokens**, while
keeping it privately scoped to the user and nothing-leaves-your-browser by
default. Cross-device movement becomes a deliberate, manual copy of a code or
file — no background service, no credentials.

## Non-goals

- Automatic background cross-device sync (explicitly traded away — that's what
  required a server/credentials).
- Any backend or third-party service. The site stays a static GitHub Pages app.

## Design

### Keep (unchanged)
- `localStorage` as the automatic per-browser store (`er-guide-progress-v1`),
  including the corrupt-save backup behavior in `progress.ts`.
- NG+ profiles (`switchProfile`, profile dropdown).
- JSON file **export / import** (`doExport` / `doImport` in `ProgressPage.tsx`,
  backed by `store.exportJson()` / `store.importJson()`) as the full-fidelity
  backup. This is the robust path and stays the headline backup mechanism.

### Remove (the simplification)
- Delete `src/lib/gistSync.ts` and `src/lib/gistSync.test.ts`.
- Remove the entire "Cloud sync (GitHub)" `<section>` from
  `ProgressPage.tsx` (lines ~123–200), plus the `gistSync` import, the
  `syncStatus`/`tokenInput` state, the `doConnect` function, and the two
  `useEffect`s that drive auto-sync (lines ~14–38).
- Remove the "Cloud sync (optional)" section from `README.md` (lines ~51–66).

### Add — "Sync code"
A compact, copy-pasteable string that encodes the user's **entire** save
(`SaveData`: all profiles, checked + ignored maps), for moving progress to
another device without handling a file.

**New module `src/lib/syncCode.ts`:**
- `encodeSyncCode(json: string): Promise<string>` — gzip the export JSON via the
  Web `CompressionStream('gzip')` API, then base64url-encode. The save is mostly
  short item-id strings, which gzip extremely well; a completionist save (a few
  hundred ids) compresses to ~1–2 KB → a few thousand base64url chars.
- `decodeSyncCode(code: string): Promise<string>` — reverse (base64url-decode →
  `DecompressionStream('gzip')`), returning the original JSON.
- **Fallback:** if `CompressionStream` is unavailable, encode raw JSON as
  base64url (still works, just longer). A 1-byte version/format prefix
  distinguishes gzip vs raw so decode picks the right path.
- Decode throws on malformed input; callers surface the error like the existing
  import error handling.

**Reuse, not new serialization:** the code wraps `store.exportJson()` and feeds
`store.importJson()` on the way back, so format/versioning stays centralized in
`progress.ts` (`SaveData.schemaVersion`).

### UI changes on `ProgressPage.tsx`
Replace the removed cloud-sync section with a "Move to another device" section:
- **Copy sync code** button → `encodeSyncCode(store.exportJson())` → write to
  clipboard, show transient "copied" confirmation.
- **Load from sync code** → a paste box + Load button → `decodeSyncCode` →
  `store.importJson`. On success clear the box; on failure show the error inline
  (mirror existing `importError` pattern).
- A short helper line explaining: local-by-default, use the code or file to move
  between devices.

### Shareable URL form
- A sync code can also ride in the URL: `#/progress?code=<sync-code>`.
- On `ProgressPage`, read the `code` param via `useSearchParams` (works inside
  `HashRouter`). If present, **do not auto-import** — show a confirm banner
  ("A sync code was shared with this link — load it? This replaces your current
  progress.") with Load / Dismiss, consistent with the existing
  "nothing is ever auto-imported" ethos. On Load, decode + import, then strip the
  `code` param from the URL.

## Error handling
- Decode failures (bad paste, truncated link) never mutate the store —
  `importJson` already throws before mutating on invalid data; `decodeSyncCode`
  throws before that on malformed codes. Both surface as inline messages.
- `CompressionStream` absence is handled by the raw-base64 fallback, not an error.

## Testing
- `src/lib/syncCode.test.ts`: round-trip `encode → decode` returns the original
  JSON; gzip path and raw fallback path both round-trip; malformed code rejects;
  a realistic large save (hundreds of ids) round-trips. (Node ≥18 / the test
  runtime provides `CompressionStream`; if the runtime lacks it the test asserts
  the fallback path.)
- Existing `progress.test.ts` is unaffected (store API unchanged).
- `gistSync.test.ts` is deleted with its module.

## Files touched
- **Delete:** `src/lib/gistSync.ts`, `src/lib/gistSync.test.ts`
- **Add:** `src/lib/syncCode.ts`, `src/lib/syncCode.test.ts`
- **Edit:** `src/pages/ProgressPage.tsx`, `README.md`

## Risks
- Very large saves make for long codes/URLs. Mitigated by gzip; the file
  export remains the unbounded path for edge cases. Acceptable.
- URL-length limits for `?code=` on extreme saves — the copy/paste code path is
  the fallback when a link would be too long; documented in the helper text.
