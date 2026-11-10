# Web app: local first

`/app` must feel instant on a reload and on every click. A screen paints from data already in the browser and never waits on the network to show what it knows.

## How a reload works

1. The server sends the shell only (`ssr: false` on `/_account/app`), and never waits on Convex for it. A live `convex_jwt` cookie (`jwtCache`) is the session. With no JWT but a session cookie, which is every return after the JWT's 24 hours, the `/app` loader fetches the token in the browser, and redirects if none comes back. With neither, the visitor gets a real 307, because the gate lives in `_account`.
2. The loader restores the last copy of the ledger from IndexedDB (`lib/ledger-cache.ts`) into the same TanStack DB collections with `DbClient.hydrate`, and returns without waiting for Convex.
3. The collections subscribe in the background. Their first result replaces the restored rows, so a row added or deleted elsewhere appears or disappears on its own.
4. Once synced, the copy is saved again, a second after the last change.

## Rules for new work

- Read ledger data from the collections in `lib/ledger-db.ts`, through the dashboard context. A new table is one entry in `ledgerCollections`, declared with `ledgerTable(...)`: that starts its load, and what the load starts is in the copy. The entry must be one of the backend's `LedgerBooks` or a tag table, and the build fails until `ledgerBooks` and `useLedgerBooks` read it. Tags are a second group (`tagBooks`, `useTagBooks`), read by the few screens that need them, so a tag change does not rebuild every screen's ledger.
- No server function, `beforeLoad` round trip or awaited query between a click and its paint. Filters are search params over data already in memory, and the session token is kept in the router context until it expires.
- A loader under `/app` awaits nothing when a copy was restored. Anything the first paint needs from Convex goes in the snapshot, as minted photo URLs do.
- Set `pendingMs: 0` and `pendingMinMs: 0` on a route with a pending component: the router's default holds it on screen for 500 ms, whatever the data does.
- Restore only into idle collections: a second load, after a hover preload or a retry, must not seed older rows under a running sync.
- Count a restored photo URL's remint from its mint, not the mount: it is already part way through its life.
- A screen's pending state is that same screen inside skullet's `<Skeleton loading>`, fed by `sampleDashboard`, so it cannot drift from the real layout. Leave the live screens unwrapped: remembered shapes add nothing over the copy, and their `MutationObserver` serializes the DOM after every chart hover.
- The `ledger_copy` cookie tells the server a copy exists. Without it, `_account` renders the skeleton on the server, so a first visit paints it long before the JavaScript arrives. It lives in `_account` because the router remounts an `ssr: false` route's pending component while hydrating, and each mount renders and measures the sample again. Each screen's lazy chunk holds its whole skeleton: a nested `lazy` still loading at hydration makes React drop the server HTML, and a slow phone then shows a blank page until that chunk lands. With the cookie, the skeleton is lazy and waits 150 ms: on the server it nearly doubled the reload, and a restored copy lands before the wait ends.
- The onboarding gate (`Ledgered` in `routes/_account/app.tsx`) runs in render, over the books and the device's progress in `localStorage` (`lib/onboarding.ts`). It must stay out of the loader: a restored copy answers it with no round trip. Progress is written before the step's first ledger write, because that write alone makes the ledger look set up and would end the flow.
- Bump `LEDGER_CACHE_VERSION` when a ledger row loses or retypes a field the web reads. Adding a field needs no bump, but the code must tolerate its absence until the first sync.

## How a write works

Every ledger commit goes through `ledgerCommitter(db, userId)` in `lib/ledger-committer.ts`; a component reaches it with `useLedgerCommitter()`. `commit(rows)` shows the rows at once and pushes them. It never rejects: `settled` resolves to `saved`, `failed` or `undone`, and the caller decides how a failure looks.

- Unsent rows are written to `localStorage` when their push starts and removed when it is answered. `resume()`, run after each signed-in load, sends what a closed page left and drops rows of another account. Sign-out clears them with the copy.
- A failed commit leaves nothing shown and nothing stored. `retry()` on its outcome shows and pushes the same rows again.
- A held commit (`{ holdMs }`) is the Undo window: it is pushed when the hold runs out, on `flush()` or on `pagehide`, and `undo()` and `add()` return false after that. It reaches storage when it is pushed, not while it is held, so another tab cannot send what the person may still undo.
- The saved copy holds only rows the server has confirmed, so a reload never restores an unsent row and `resume()` cannot apply one twice. `ledger-committer.test.ts` pins this.
- A failed commit rolls back every unsent commit on the same rows, as TanStack DB does for conflicting transactions.
- The push runs beside the TanStack DB transaction, not inside its handler: a transaction that shows nothing never runs its handler, and budget plans are pushed without being shown. The transaction ends only after the touched collections have synced, or the change flickers back for a frame.
- Rows are built by pure functions in `lib` (`*-writes.ts`, `transfer-create.ts`), never in a component. Do not call `createTransaction` or `pushRows` for ledger rows anywhere else. Settings (`writeSettings`) and the archive import are the two exceptions.

## The copy is the user's financial data

It sits unencrypted in IndexedDB, like the native app's SQLite file. It is keyed to the JWT's subject and dropped on sign-out (`forgetLedger`, which also stops a save waiting on its timer), when Convex refuses the subscription during a load (a lapsed Pro, `dropLedger`), and when another user signs in on the same browser. A refusal while the tab stays open leaves the copy until the next load. Unsent rows sit in `localStorage` under the same rules: tagged with the user, cleared on sign-out, and dropped on a load by anyone else. Signing out, or signing in by email, tells other tabs (`announceSessionChange`), and they reload, so none keeps saving the previous account's rows. An Apple or Google sign-in returns through a redirect and does not announce.

## Measuring

Measure a production build against a backend with real latency, not `vp dev` on localhost: a local Convex hides the round trips that make the difference. On 5,000 rows at 100 ms RTT, the numbers to hold are about 30 ms to the shell and 160 ms to real data on a reload, and about 25 ms from a filter click to its paint.
