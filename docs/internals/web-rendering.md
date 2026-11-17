# Web app: server render, local clicks

The web app (`apps/app`, at app.tryoutlayr.com) sends a finished page on every load and never waits on the network after it. The server reads the visitor's ledger and renders the real screen, so the first paint has the rows, the name and the photos. From then on every click reads collections already in the browser.

## How a load works

1. `_account` asks for the token in `beforeLoad`. A live `convex_jwt` cookie (`jwtCache`) is the session; with only the session cookie the server mints a token; with neither (`signedOutOf`) it skips the round trip and sends a real 307 to `/login`. The token is set on the request's `ConvexHttpClient` (`serverHttpClient`), which server queries use.
2. On the server, the `_app` loader runs `serverLedger(token)` (`lib/ledger-server.ts`): it pulls every table from cursor 0 (`sync.pullSince`), reads the exchange rates and the better-auth profile, and mints the photo URLs the rows reference. The rows go into the request's `DbClient` with `hydrate`, the photos and the profile into the query cache.
3. `routerWithDbClient` dehydrates the collections with their cursor (`exportSyncMeta`) into the HTML, and `setupRouterSsrQueryIntegration` does the same for the query cache. Server live queries render the real screen from those rows.
4. In the browser, `DbClient.hydrate` fills the same collections before React hydrates, and `importSyncMeta` hands the sync the server's cursor. The sync (`lib/ledger-sync.ts`) then subscribes from that cursor, so it downloads only rows written after the page was rendered.
5. A client navigation into `_app` (after sign-in) runs the loader in the browser: `preloadLedger` pulls from cursor 0 under the pending skeleton.

## Rules for new work

- Read ledger data from the collections in `lib/ledger-db.ts`, through the dashboard context. A new table is one entry in `ledgerCollections`, declared with `ledgerTable(docs("<table>"))`: that adds it to the server pull, the hydration and the live sync. The entry must be one of `LedgerBooks` (`lib/ledger-books.ts`) or a tag table, and the build fails until `ledgerBooks` and `useLedgerBooks` read it. `LedgerBooks` is those tables as Convex docs and extends the rows the read model in `@outlayr/money/ledger-view` reads, so a schema change that breaks a read fails the build there. Tags are a second group (`tagBooks`, `useTagBooks`), read by the few screens that need them, so a tag change does not rebuild every screen's ledger.
- Read a table with `useRows`, not `useLiveQuery`. The router streams every live query's rows into the page beside the hydrated tables, which sent each row twice.
- No server function, `beforeLoad` round trip or awaited query between a click and its paint. Filters are search params over data already in memory, and the session token is kept in the router context until it expires.
- Anything the first paint needs from Convex is fetched on the server and carried to the browser, as the rows, the photo URLs and the profile are. A `useQuery` written in a screen renders empty on the server and fills after hydration, which is the flash this design exists to remove.
- The server never opens a Convex subscription. Its tables take the `SERVER` dependency (`serverDependencies` in `lib/db.ts`), which gives them a sync that only holds the hydrated rows and their cursor (`serverSync`). The tables pick it from the dependency, not from `import.meta.env.SSR`, because vitest sets that flag in node.
- Render nothing on the server that differs in the browser. The server has no window and runs in UTC: read widths through `useSyncExternalStore` with a server answer (see `_app.settings.index.tsx`), and format ledger dates with the zone the ledger math uses, never the machine's.
- Set `pendingMs: 0` and `pendingMinMs: 0` on a route with a pending component: the router's default holds it on screen for 500 ms, whatever the data does.
- One cursor serves every table, so the tables start, fail and restart together, and none is read from Convex on its own. The pull starts only once every table is open, which `preloadLedger` does: a pull started earlier would begin at cursor 0 and download the whole ledger again. Exchange rates are not the user's rows and stay a plain query collection in the browser.
- The sync is the only thing that fills a table in the browser and it never sends a row twice. So the tables are never garbage collected (`gcTime: 0`), and a sync write is always an upsert by `localId`, which is safe to repeat.
- The cursor sent with the page is the one whose rows every table holds, read in the same `dehydrate` as the rows (`exportSyncMeta`). A cursor ahead of its rows would lose them for good; one behind only downloads them again.
- The page reloads when the server's seq (`sync.currentSeq`) is behind the cursor. The same watch lets a write end: a push answers with the seq of every table, the pull leaves the tables no screen reads out, and only the server's seq can carry the cursor past their rows.
- A deleted entry or transfer leaves its table, as the server's queries used to leave it out. Every other table keeps the tombstone, which the read model filters.
- Count a photo URL's remint from its mint (`mintedAt` on the seed), not the mount: it is already part way through its life.
- A screen's pending state is that same screen inside skullet's `<Skeleton loading>`, fed by `sampleDashboard`, so it cannot drift from the real layout. It shows only on a client navigation into `_app`. Leave the live screens unwrapped: their `MutationObserver` serializes the DOM after every chart hover.
- The onboarding gate (`Ledgered` in `routes/_account/_app.tsx`) runs in render, over the books and the device's progress in `localStorage` (`lib/onboarding.ts`). It must stay out of the loader. Progress is written before the step's first ledger write, because that write alone makes the ledger look set up and would end the flow.

## Data that is not a ledger row

The plan, usage limits, the profile, sessions, sign-in methods, connections, referrals, shared links and push settings are account state. They are TanStack Query answers, not collections.

- Define the query once in `lib/account-state.ts`, add it to `warmAccountState`, and, when a screen paints it, to `serverAccountState` in `lib/ledger-server.ts`, which the settings loader awaits on the server. A screen reads that same options object.
- Unknown is not a value. Until an answer exists, render the same card inside `<Skeleton loading>`, with one sample row where a count decides the height. Never render a default that reads as an answer: Free, 0, a switch that is off, "not shared", a nav item that is missing.
- Every answer the server fetched lands in the HTML. Send no secret: the session list keeps `id`, `updatedAt` and `userAgent` and drops the token (`sessionRows`); the profile is six fields mirrored from the better-auth session store, not the session.
- The better-auth endpoints are read with the visitor's cookies forwarded (`authGet`). Convex answers their dates as epoch milliseconds, so the schemas take a number or a string.
- An action has no live subscription, so it needs a real `staleTime` (`planQuery`: 5 minutes, and Plan settings asks again on every mount). Listed queries set `gcTime: Infinity`: a collected query loses its Convex watch.
- The settings pending tree renders under a query client that never fetches (`SettingsPending`), so an answer that lands mid-skeleton cannot move the bones.

## How a write works

Every ledger commit goes through `ledgerCommitter(db, userId)` in `lib/ledger-committer.ts`. `commit(rows)` shows the rows at once and pushes them. It never rejects: `settled` resolves to `saved`, `failed` or `undone`.

A component reaches it with `useLedgerCommitter()`, which also owns how an outcome reads (`lib/commit-notices.ts`). A caller states its rows and its copy:

- `commit(rows, { failed, saved })` resolves to whether the rows were saved. With `failed` it tells the person when they were not, and with `saved` it says so at once. A flow that says a refusal in its own place (the imports, erase, an onboarding step) passes no copy and reads the answer.
- A dialog never awaits its commit. It commits, closes and starts any navigation in the same handler, and the `failed` copy is how a refusal is heard. No inline error and no saving spinner: the dialog is gone before either could show.
- A form whose typing a refusal would lose reads the answer only to bring it back: `reopen(flow)` from `useAccountFlows()` with the values as the flow's `draft`. It does nothing while another dialog is open.
- `commitWithUndo(rows, { text, failed })` is a held commit with its Undo notice. The notice leaves when the hold runs out, a failure takes its place, and `onUndone` runs only if Undo still worked. `after` keeps the notice back until a navigation has landed. An action with Undo is this, not a commit followed by a second one that takes it back.
- `current()` is the ledger with the books as the browser's collections hold them right now, for rows built in a handler.
- `notify(notice)` speaks through the same host, for a notice that is not a commit's own.
- Notices go to the shell's host unless the page has its own toast region. Such a page passes its surface (`entryNotices`, `ruleNotices`, `settingsNotices`), which also says how long its Undo lasts: do not add a second hold constant or a hand-made failure toast.

Under the hook:

- Unsent rows are written to `localStorage` when their push starts and removed when it is answered. `resume()`, run as each signed-in load starts, shows what a closed page left, sends it once the server has answered the load, and drops rows of another account. A refused load leaves them stored. Sign-out clears them (`forgetLedger`).
- A failed commit leaves nothing shown and nothing stored. `retry()` on its outcome shows and pushes the same rows again.
- A held commit (`{ holdMs }`) is the Undo window: it is pushed when the hold runs out, on `flush()` or on `pagehide`, and `undo()` and `add()` return false after that. It reaches storage when it is pushed, not while it is held, so another tab cannot send what the person may still undo.
- A dehydrate holds only rows the server has confirmed, so a page never carries an unsent row and `resume()` cannot apply one twice. `ledger-committer.test.ts` pins this.
- A failed commit rolls back every unsent commit on the same rows, as TanStack DB does for conflicting transactions.
- The push runs beside the TanStack DB transaction, not inside its handler: a transaction that shows nothing never runs its handler. The transaction ends only after the sync has handed the tables every row up to the push's seq, or the change flickers back for a frame.
- Rows are built by pure functions in `lib` (`*-writes.ts`, `transfer-create.ts`), never in a component. Do not call `createTransaction` or `pushRows` for ledger rows anywhere else. Settings (`writeSettings`) and the archive import are the two exceptions. `writeSettings` shows the change at once and rejects when it is refused: call it through `useSaveSettings()` or catch it and `notify`, never bare.

## The page is the user's financial data

The HTML of every `_app` page holds the visitor's whole ledger and account state, so it is never cached: not by a CDN, not by a service worker. Nothing of the ledger is kept in the browser between loads. Unsent rows sit in `localStorage`, tagged with the user, cleared on sign-out and dropped on a load by anyone else. Browsers that ran the IndexedDB build still hold its copy until their next load, which deletes it (`dropOldCopy`). Signing out, or signing in by email, tells other tabs (`announceSessionChange`), and they reload, so none keeps showing the previous account's rows. An Apple or Google sign-in returns through a redirect and does not announce.

## Measuring

Measure a production build against a backend with real latency, not `vp dev` on localhost: a local Convex hides the round trips the server pull pays. In production the server reaches Convex over the Docker network (`CONVEX_INTERNAL_URL`, `serverConvexUrl`), not back through Cloudflare, and the pull asks for one big page (`PULL_PAGE_MAX`). Each extra serial call on the load path costs a round trip, so mint and fetch beside the pull, never after it. Watch the HTML size too: 242 rows come to about 360 KB, 46 KB gzipped.

Every server render reports its steps in the `Server-Timing` header (`timed` in `lib/server-timing.ts`, `total` in `src/server.ts`), so the browser's Network panel shows where a slow load went. Wrap a new server step on the load path in `timed`. The HTML response also carries a `Link` header for the page's scripts, styles and fonts, which Cloudflare replays as a 103 Early Hints on later visits; it only reads `preload` and `preconnect`, so `src/server.ts` rewrites `modulepreload`.
