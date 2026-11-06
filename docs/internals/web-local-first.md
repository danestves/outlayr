# Web app: local first

`/app` must feel instant on a reload and on every click. A screen paints from data already in the browser and never waits on the network to show what it knows.

## How a reload works

1. The server sends the shell only (`ssr: false` on `/_account/app`). `_account` reads the session from the `convex_jwt` cookie (`jwtCache`), so the response makes no Convex call. A signed-out visitor still gets a real 307, because the gate lives in `_account`.
2. The loader restores the last copy of the ledger from IndexedDB (`lib/ledger-cache.ts`) into the same TanStack DB collections with `DbClient.hydrate`, and returns without waiting for Convex.
3. The collections subscribe in the background. Their first result replaces the restored rows, so a row added or deleted elsewhere appears or disappears on its own.
4. Once synced, the copy is saved again, a second after the last change.

## Rules for new work

- Read ledger data from the collections in `lib/ledger-db.ts`, through the dashboard context. A new table is a new collection there, added to `preloadLedger`, `ledgerBooks` and `useLedgerBooks`: a collection the load does not start is not in the copy.
- No server function, `beforeLoad` round trip or awaited query between a click and its paint. Filters are search params over data already in memory, and the session token is kept in the router context until it expires.
- A loader under `/app` awaits nothing when a copy was restored. Anything the first paint needs from Convex goes in the snapshot, as minted photo URLs do.
- Set `pendingMs: 0` and `pendingMinMs: 0` on a route with a pending component: the router's default holds it on screen for 500 ms, whatever the data does.
- Bump `LEDGER_CACHE_VERSION` when a ledger row loses or retypes a field the web reads. Adding a field needs no bump, but the code must tolerate its absence until the first sync.

## The copy is the user's financial data

It sits unencrypted in IndexedDB, like the native app's SQLite file. It is keyed to the JWT's subject and dropped on sign-out (`forgetLedger`), when Convex refuses the subscription during a load (a lapsed Pro, `dropLedger`), and when another user signs in on the same browser. A refusal while the tab stays open leaves the copy until the next load. Signing out, or signing in by email, tells other tabs (`announceSessionChange`), and they reload, so none keeps saving the previous account's rows. An Apple or Google sign-in returns through a redirect and does not announce.

## Measuring

Measure a production build against a backend with real latency, not `vp dev` on localhost: a local Convex hides the round trips that make the difference. On 5,000 rows at 100 ms RTT, the numbers to hold are about 30 ms to the shell and 160 ms to real data on a reload, and about 25 ms from a filter click to its paint.
