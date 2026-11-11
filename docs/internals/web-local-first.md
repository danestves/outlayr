# Web app: local first

`/app` must feel instant on a reload and on every click. A screen paints from data already in the browser and never waits on the network to show what it knows.

## How a reload works

1. The server sends the shell only (`ssr: false` on `/_account/app`), and never waits on Convex for it. A live `convex_jwt` cookie (`jwtCache`) is the session. With no JWT but a session cookie, which is every return after the JWT's 24 hours, the `/app` loader fetches the token in the browser, and redirects if none comes back. With neither, the visitor gets a real 307, because the gate lives in `_account`.
2. The loader restores the last copy of the ledger from IndexedDB (`lib/ledger-cache.ts`) into the same TanStack DB collections with `DbClient.hydrate`, and returns without waiting for Convex.
3. One sync (`lib/ledger-sync.ts`) asks Convex, in the background, for the rows that changed after the copy's cursor (`sync.pullSince`) and applies those rows alone, the way the native app does. An unchanged ledger downloads no rows, a row changed on another device arrives by itself, and a first visit starts at cursor 0 and downloads each row once, page by page.
4. Once synced, the copy is saved again, a second after the last change, together with the cursor its rows reach.

## Rules for new work

- Read ledger data from the collections in `lib/ledger-db.ts`, through the dashboard context. A new table is one entry in `ledgerCollections`, declared with `ledgerTable(docs("<table>"))`: that adds it to the pull, to the load and to the copy. The entry must be one of `LedgerBooks` (`lib/ledger-books.ts`) or a tag table, and the build fails until `ledgerBooks` and `useLedgerBooks` read it. `LedgerBooks` is those tables as Convex docs and extends the rows the read model in `@outlayr/money/ledger-view` reads, so a schema change that breaks a read fails the build there. Tags are a second group (`tagBooks`, `useTagBooks`), read by the few screens that need them, so a tag change does not rebuild every screen's ledger.
- No server function, `beforeLoad` round trip or awaited query between a click and its paint. Filters are search params over data already in memory, and the session token is kept in the router context until it expires.
- A loader under `/app` awaits nothing when a copy was restored. Anything the first paint needs from Convex goes in the snapshot, as minted photo URLs do.
- Set `pendingMs: 0` and `pendingMinMs: 0` on a route with a pending component: the router's default holds it on screen for 500 ms, whatever the data does.
- Restore only into idle collections: a second load, after a hover preload or a retry, must not seed older rows under a running sync.
- The copy is the store and the sync only moves rows. One cursor serves every table, so the tables start, fail and restart together, and none is read from Convex on its own. The pull starts only once every table is open, which `preloadLedger` does after the restore: the pending shell reads the settings table earlier, and a pull started then would begin at cursor 0 and download the whole ledger. Exchange rates are not the user's rows and stay a plain query collection.
- The sync is the only thing that fills a table and it never sends a row twice. So the tables are never garbage collected (`gcTime: 0`), and a sync write is always an upsert by `localId`, which is safe to repeat.
- The saved cursor is the one whose rows every table already shows, read in the same `dehydrate` as the rows (`exportSyncMeta`). A cursor ahead of its rows would lose them for good; one behind only downloads them again.
- A copy is dropped and the page starts over when a table has no cursor in it (the table set changed) or when the server's seq (`sync.currentSeq`) is behind its cursor. The same watch lets a write end: a push answers with the seq of every table, the pull leaves the tables no screen reads out, and only the server's seq can carry the cursor past their rows.
- A deleted entry or transfer leaves its table, as the server's queries used to leave it out. Every other table keeps the tombstone, which the read model filters.
- Count a restored photo URL's remint from its mint, not the mount: it is already part way through its life.
- A screen's pending state is that same screen inside skullet's `<Skeleton loading>`, fed by `sampleDashboard`, so it cannot drift from the real layout. Leave the live screens unwrapped: remembered shapes add nothing over the copy, and their `MutationObserver` serializes the DOM after every chart hover.
- The `ledger_copy` cookie tells the server a copy exists. Without it, `_account` renders the skeleton on the server, so a first visit paints it long before the JavaScript arrives. It lives in `_account` because the router remounts an `ssr: false` route's pending component while hydrating, and each mount renders and measures the sample again. Each screen's lazy chunk holds its whole skeleton: a nested `lazy` still loading at hydration makes React drop the server HTML, and a slow phone then shows a blank page until that chunk lands. With the cookie, the skeleton is lazy and waits 150 ms: on the server it nearly doubled the reload, and a restored copy lands before the wait ends.
- The onboarding gate (`Ledgered` in `routes/_account/app.tsx`) runs in render, over the books and the device's progress in `localStorage` (`lib/onboarding.ts`). It must stay out of the loader: a restored copy answers it with no round trip. Progress is written before the step's first ledger write, because that write alone makes the ledger look set up and would end the flow.
- Bump `LEDGER_CACHE_VERSION` when a ledger row loses or retypes a field the web reads, or when the sync changes which rows a table keeps. Adding a field needs no bump, but the code must tolerate its absence until the first sync.

## Data that is not a ledger row

The plan, usage limits, the profile, sessions, sign-in methods, connections, referrals, shared links and push settings are account state. They are TanStack Query answers, not collections, and they follow the same rule as the rows: the first frame shows the last known answer.

- Define the query once in `lib/account-state.ts` and add it to `COPIED` and `warmAccountState`. The save writes the listed answers beside the rows (`accountStateOf`, TanStack Query's `dehydrate`), the `/app` loader restores them before the first paint (`restoreAccountState`), and on a first visit the loader starts every fetch without awaiting one. A screen reads that same options object. A `useQuery(convexQuery(...))` written in a screen is fetched after paint on every reload.
- Unknown is not a value. Until an answer exists, render the same card inside `<Skeleton loading>`, with one sample row where a count decides the height. Never render a default that reads as an answer: Free, 0, a switch that is off, "not shared", a nav item that is missing.
- A `null` that means the server could not say (`billing.plan`, `limits.mine`, `referrals.overview`) is never copied.
- Copy no secret. The session list keeps `id`, `updatedAt` and `userAgent` and drops the token (`sessionRows`); the profile is six fields mirrored from the better-auth session store, not the session.
- An action has no live subscription, so it needs a real `staleTime` (`planQuery`: 5 minutes, and Plan settings asks again on every mount). Listed queries set `gcTime: Infinity`: a collected query loses its Convex watch and its place in the next save.
- Every minted photo batch (the overview, row thumbnails, archived accounts) rides the copy while it is younger than `PHOTO_REMINT_MS`, and is dropped on restore once older. A copy older than that repaints its photos after the first frame: the signed URLs have expired and nothing proxies them.
- The settings pending tree renders under a query client that never fetches (`SettingsPending`), so an answer that lands mid-skeleton cannot move the bones.
- Bump `LEDGER_CACHE_VERSION` when a copied answer loses or retypes a field.

## How a write works

Every ledger commit goes through `ledgerCommitter(db, userId)` in `lib/ledger-committer.ts`. `commit(rows)` shows the rows at once and pushes them. It never rejects: `settled` resolves to `saved`, `failed` or `undone`.

A component reaches it with `useLedgerCommitter()`, which also owns how an outcome reads (`lib/commit-notices.ts`). A caller states its rows and its copy:

- `commit(rows, { failed, saved })` resolves to whether the rows were saved. With `failed` it tells the person when they were not, and with `saved` it says so at once. A flow that says a refusal in its own place (the imports, erase, an onboarding step) passes no copy and reads the answer.
- A dialog never awaits its commit. It commits, closes and starts any navigation in the same handler, and the `failed` copy is how a refusal is heard. No inline error and no saving spinner: the dialog is gone before either could show.
- A form whose typing a refusal would lose reads the answer only to bring it back: `reopen(flow)` from `useAccountFlows()` with the values as the flow's `draft`. It does nothing while another dialog is open.
- `commitWithUndo(rows, { text, failed })` is a held commit with its Undo notice. The notice leaves when the hold runs out, a failure takes its place, and `onUndone` runs only if Undo still worked. `after` keeps the notice back until a navigation has landed. An action with Undo is this, not a commit followed by a second one that takes it back.
- `current()` is the ledger with the books as the local copy holds them right now, for rows built in a handler.
- `notify(notice)` speaks through the same host, for a notice that is not a commit's own.
- Notices go to the shell's host unless the page has its own toast region. Such a page passes its surface (`entryNotices`, `ruleNotices`, `settingsNotices`), which also says how long its Undo lasts: do not add a second hold constant or a hand-made failure toast.

Under the hook:

- Unsent rows are written to `localStorage` when their push starts and removed when it is answered. `resume()`, run as each signed-in load starts, shows what a closed page left, sends it once the server has answered the load, and drops rows of another account. A refused load leaves them stored. Sign-out clears them with the copy.
- A failed commit leaves nothing shown and nothing stored. `retry()` on its outcome shows and pushes the same rows again.
- A held commit (`{ holdMs }`) is the Undo window: it is pushed when the hold runs out, on `flush()` or on `pagehide`, and `undo()` and `add()` return false after that. It reaches storage when it is pushed, not while it is held, so another tab cannot send what the person may still undo.
- The saved copy holds only rows the server has confirmed, so a reload never restores an unsent row and `resume()` cannot apply one twice. `ledger-committer.test.ts` pins this.
- A failed commit rolls back every unsent commit on the same rows, as TanStack DB does for conflicting transactions.
- The push runs beside the TanStack DB transaction, not inside its handler: a transaction that shows nothing never runs its handler. The transaction ends only after the sync has handed the tables every row up to the push's seq, or the change flickers back for a frame.
- Rows are built by pure functions in `lib` (`*-writes.ts`, `transfer-create.ts`), never in a component. Do not call `createTransaction` or `pushRows` for ledger rows anywhere else. Settings (`writeSettings`) and the archive import are the two exceptions. `writeSettings` shows the change at once and rejects when it is refused: call it through `useSaveSettings()` or catch it and `notify`, never bare.

## The copy is the user's financial data

It sits unencrypted in IndexedDB, like the native app's SQLite file, and holds the account state above in the same record. It is keyed to the JWT's subject and dropped on sign-out (`forgetLedger`, which also stops a save waiting on its timer), when Convex refuses the subscription during a load (a lapsed Pro, `dropLedger`), and when another user signs in on the same browser. A refusal while the tab stays open leaves the copy until the next load. Unsent rows sit in `localStorage` under the same rules: tagged with the user, cleared on sign-out, and dropped on a load by anyone else. Signing out, or signing in by email, tells other tabs (`announceSessionChange`), and they reload, so none keeps saving the previous account's rows. An Apple or Google sign-in returns through a redirect and does not announce.

## Measuring

Measure a production build against a backend with real latency, not `vp dev` on localhost: a local Convex hides the round trips that make the difference. On 5,000 rows at 100 ms RTT, the numbers to hold are about 30 ms to the shell and 160 ms to real data on a reload, and about 25 ms from a filter click to its paint.
