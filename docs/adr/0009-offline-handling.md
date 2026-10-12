# ADR-0009: Offline is a distinct, honest state — requests pause and resume

Status: Accepted · Date: 2026-10-12

## Context

The PDF stresses slow and failing networks; going offline is the extreme case (and DevTools "Offline" is an obvious
demo). TanStack Query already _pauses_ queries while the browser reports offline, but the UI read a paused query as
"loading": a search made offline showed a skeleton forever and even claimed "the server is responding slowly".

## Decision

- **Single source of truth:** TanStack's `onlineManager` (fed by window `online`/`offline` events, seeded from
  `navigator.onLine` at startup). The UI reads it via `useOnlineStatus`, so it can't disagree with the data layer.
- **States:** a query paused with nothing loaded for the current result set → `offline` list state (no rows from a
  previous search). Pages paused while scrolling → rows say "waiting for connection". Drawer → offline message.
- **Already-loaded results stay visible** — they are the latest successful data _for this exact query_ — under an
  app-wide banner saying they may be out of date. Going offline is announced assertively; reconnecting politely,
  with a short "Back online — refreshing results" banner.
- **Recovery is automatic:** paused requests resume and failed ones refetch on reconnect (`refetchOnReconnect`).
  No manual retry needed.

## Alternatives

- **Treat offline as an error** (fetch fails → error + Retry) — misleading: nothing is wrong with the server, and
  Retry would fail until the network returns.
- **Service worker / offline app shell** — lets the app _start_ offline and could serve cached API responses, but
  adds cache-invalidation risk (serving stale results is exactly what the assignment forbids). Not done.

## Consequences

- Detection relies on browser online/offline events: "connected but no internet" (captive portals) looks online, and
  requests then fail and show the normal error state with Retry.
