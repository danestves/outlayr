# Convex sync for user data

Design for issue #135.

**The backend is Convex. CloudKit is not on the table** — that decision was made by the
repo owner and this document does not reopen it.

**Status: shipped.** This began as a design with nothing built behind it; the plan in §7
was then followed through. Auth, the outbox, push, pull, adoption and the Settings row all
exist now — see the slice table in §7 for what landed where. Everything below §1 is kept as
the reasoning behind the shape that shipped, not as a proposal.

---

## 0. What is actually there today

Verified against the tree, not from memory:

| Thing | Where | State |
|---|---|---|
| Convex client | `apps/native/src/app/_layout.tsx` | `ConvexBetterAuthProvider`, mounted only when `cloud-runtime.ts` resolved a configured deployment |
| Convex usage | `apps/native/src/data/sync-engine-core.ts` and the exchange-rate pull | the sync engine drains the outbox and applies `pullSince` |
| Auth | `packages/backend/convex/auth.ts`, `auth.config.ts`, `http.ts` | Better Auth; `convex.config.ts` calls `app.use()` for betterAuth, r2, rateLimiter, agent and revenuecat |
| Source of truth | `apps/native/src/db/schema.ts` | expo-sqlite + drizzle, local-first |
| Sync affordances already in the local schema | `src/db/schema.ts` | every user table already carries `updatedAt` **and** a soft-delete `deletedAt`, explicitly "so a future sync layer can reconcile without a schema migration" |
| Settings row | `src/screens/settings/index.tsx` | reads live state from `useSyncStatus` |

`docs/convex-better-auth-swift.md` does **not** exist in this repo. It was written for
the deleted SwiftUI client and did not survive the rebuild; there is nothing to re-judge.

S2/S3 were ported from a sibling Better-T-Stack checkout rather than designed here.

---

## 1. Auth

### Verdict: Better Auth inside Convex via `@convex-dev/better-auth`. Endorsed.

Verified live (not from memory) on 2026-07-29:

- `@convex-dev/better-auth@0.12.5`, published 2026-06-27.
- Its peer ranges: `convex ^1.25.0`, `better-auth >=1.6.11 <1.7.0`, `react ^18.3.1 || ^19.0.0`.
- This repo has `convex ^1.45.0` (pinned once in `pnpm-workspace.yaml`; both packages
  take it as `catalog:`) and `react 19.2.3`. Both satisfied.
- `better-auth` latest is `1.6.25`; `@better-auth/expo@1.6.25` peers on
  `expo-constants`, `expo-linking`, `expo-network`, `expo-web-browser` — of which this
  app already ships `expo-constants`, `expo-linking` and `expo-web-browser`.
- There is a first-party Expo guide at
  <https://labs.convex.dev/better-auth/framework-guides/expo>.

The sibling repo pins `better-auth 1.6.15` / `@better-auth/expo 1.6.15` /
`@convex-dev/better-auth ^0.12.5` in its `pnpm-workspace.yaml` catalog. **Port those exact
pins**, do not float to `1.6.25` in the same PR as the port — one variable at a time.

### The Convex identity

`ctx.auth.getUserIdentity()` returns the Better Auth session subject.
`authComponent.getAuthUser(ctx)` additionally validates the session and returns the user
document. Sync mutations should use the **validated** form and derive `userId` from it —
never from a client argument. Every table in the schema is scoped by that `userId`
string, and every sync query/mutation must start by resolving it and reject with
`ConvexError("Not authenticated")` when it is null.

### The sign-in surface in an app that has none

Ported from the sibling, which is already the owner's stated intent (Apple + Google, no
email/password — `packages/backend/convex/auth.ts` sets `emailAndPassword: { enabled: false }`):

- `packages/backend/convex/auth.ts` — `createClient`, `betterAuth` from
  `better-auth/minimal`, Apple config with the ES256 client-secret JWT minted in-process
  via `jose`, Google with the web+iOS client-id pair, plugins `[expo(), crossDomain(), convex()]`.
- `packages/backend/convex/auth.config.ts` — `getAuthConfigProvider()`.
- `packages/backend/convex/convex.config.ts` — `app.use(betterAuth)`.
- `packages/backend/convex/http.ts` — `authComponent.registerRoutes(http, createAuth, { cors: true })`.
- `apps/native/src/lib/auth-client.ts` — `createAuthClient` with `convexClient()` and
  `expoClient({ scheme, storagePrefix, storage })` over `expo-secure-store`. The app's
  scheme is `outlayr` and the bundle id `com.tryoutlayr.app`, both in `apps/native/app.config.ts`.
- `_layout.tsx` — `ConvexBetterAuthProvider` replaces `ConvexShell`.

New native modules required: `expo-secure-store`, `expo-apple-authentication`,
`react-native-nitro-google-signin`. All three need a dev-client rebuild.

**Where the UI lives.** Not a gate. Sign-in must be *optional* — the app is local-first
and must keep working signed out, which is also what the `ConvexShell` no-URL fallback
already assumes. Put it behind a **Settings → Account** row (the same "Your data" section
that now holds the Sync row) and, later, an optional step in onboarding. Never a wall in
front of the Log.

### What happens to an existing local ledger at first sign-in

Three cases, decided by inspecting the local store at sign-in:

1. **Local ledger is untouched** — zero rows in `transactions` and no category edits
   beyond the seed set. → **Replace.** Wipe the replicated local tables and pull the account's
   ledger from seq 0. This is the normal second-device case, and wiping is what avoids
   the duplicate-seed-category problem in §5.
2. **Local ledger has data, server is empty** — the common first-ever sign-in after
   using the app offline. → **Adopt.** Push everything local, unmodified, as the
   account's initial ledger. No prompt.
3. **Both non-empty** — reinstall onto a used account, or a device that was used offline
   signing into an account that already has data. → **Ask, once.** "Keep this iPhone's
   ledger / Keep the account's ledger / Keep both". Silently merging double-counts money;
   silently wiping destroys it. This is the only case that warrants a prompt, and it is
   rare enough to afford one.

"Keep both" is a straight union — every row from both sides survives, and the duplicate
categories are the user's to clean up. Do not attempt automatic de-duplication by name.

---

## 2. Schema

Written for real in `packages/backend/convex/schema.ts`; the list of record is
`SYNCED_TABLES` in `packages/backend/convex/lib/syncTables.ts`. Sixteen replicated tables
(`categories`, `transactions`, `budgets`, `mainBudget`, `savingsGoals`, `tags`,
`transactionTags`, `transactionPhotos`, `transactionSplits`, `accounts`, `transfers`,
`installmentPlans`, `installments`, `outsidePayments`, `outsideMoves`, `appMeta`), one control table (`syncState`), and the pre-existing server-owned
`exchangeRates` unchanged.

Every replicated row carries:

```
userId     v.string()                    // Better Auth subject, server-derived
localId    v.string()                    // the SQLite primary key, a device-made UUIDv4
seq        v.number()                    // per-user monotonic, server-assigned
deviceId   v.string()                    // LWW tie-break
updatedAt  v.number()                    // client wall clock, mirrors SQLite updatedAt
deletedAt  v.union(v.number(), v.null()) // tombstone
restoredAt v.optional(v.union(v.number(), v.null())) // last restore, see R1 in §4
```

Two indexes per table and no more: `by_user_and_seq` (`["userId","seq"]`) is the pull
cursor; `by_user_and_localId` (`["userId","localId"]`) is the push upsert lookup. Nothing
else is indexed because nothing else queries these tables — every read the app performs
runs against the local SQLite replica.

### Where the local schema's assumptions translate, and where they don't

| Local assumption | Translates? | Note |
|---|---|---|
| `updatedAt` on every table (`src/db/schema.ts`, `:81`, `:119`, …) | ✅ | Already there for exactly this reason. |
| `deletedAt` soft delete | ✅ | Already there. But **two code paths ignore it** — see §6. |
| "integer cents" | ❌ **the premise is wrong** | `amount` is `real()` (`src/db/schema.ts`, `:105`, `:130`, `:151`) — float dollars, not integer cents. SQLite `REAL` and JS `number` are both IEEE-754 float64, so it round-trips bit-for-bit; sync neither introduces nor repairs the float-dollar rounding that already exists locally. Nothing to do here, but do not "fix" it inside the sync layer. |
| Recurrence columns (`onceRecurring`, `recurringType`, `recurringCoefficient`, `recurringEndDate`, `src/db/schema.ts`) | ✅ verbatim | They are plain scalars. **But** the materialization they drive (`src/data/recurrence-backfill.ts`) is a *local* computation. Two devices sweeping the same recurring parent will each mint child transactions with different UUIDs → duplicate charges. See the open question in §8. |
| `amountUsd` / `exchangeRate` / `exchangeRateType` (`:76-80`) | ✅ verbatim | Frozen at write. Never recompute them server-side; `keptCanonical` (`src/data/transactions-core.ts`) documents why re-freezing is unsafe. |
| `budgets.categoryId` `.unique()` (`src/db/schema.ts`) | ⚠️ **no Convex equivalent** | Convex has no unique constraint and the schema deliberately does not fake one. Reconciled client-side — see §4. |
| `mainBudget` singleton (`src/data/budgets-core.ts`) | ⚠️ same | Convention, not a constraint. |
| `transactionTags` one live link per `(transactionId, tagId)` (`transactionTags_pair_idx`, partial on `deletedAt IS NULL`) | ⚠️ same | Two devices tagging the same entry offline each mint their own link id. Reconciled client-side at the write — see §4. Before `0029` made the index partial, a tombstoned link still held the slot and the second link wedged every later pull. |
| `imageUri` (`:57`) | ❌ **never** — device-local | A `file://` path whose container uuid changes on every app update. Replicating it lost photos: the receiver could not resolve the path, its launch reconciliation nulled the column, and the resulting push tie-broke on `deviceId` back onto the *originating* device. Removed from the wire in S11. |
| `imageKey` | ✅ verbatim | The photo's R2 object key. Not a url — `r2.getUrl` signs one with a 15-minute default lifetime, so a stored url rots; every read re-mints from the key. The bytes travel out of band (`packages/backend/convex/photos.ts`, `apps/native/src/data/photo-sync-core.ts`), never in a `push` batch. |
| `appMeta` key/value (`:166-169`) | partly | No `updatedAt`/`deletedAt` locally. Only `SYNCED_META_KEYS` (`src/data/sync-outbox-core.ts`) sync: the currency and how the ledger reads, which belong to the person. `colorScheme` stays local because an OLED phone at night and a tablet in daylight want different answers; `numberEntryType` because a phone typed one-handed and a tablet typed with both do (syncing it let a second device reverse a choice). `biometricLock` and `notification*` describe a permission this handset holds; `sync*` and `ledgerAdoption` are this device's replication identity; `firstLaunch`, `onboardingComplete` and `recurrenceRepaired` record this install's first run. |
| `exchangeRates` local replica (`:180-194`) | ❌ never | One-way server→device, wiped and replaced by `src/data/rates.ts`. Not user data. Do not sync it. |

---

## 3. Sync protocol

Local-first, offline-usable, never blocking a write. SQLite stays the source of truth for
every read; Convex is a replication target.

### The watermark

One counter per user, `syncState.nextSeq`. The push mutation stamps each row it writes
with `seq = nextSeq + i` and then patches `nextSeq += n` — **one counter write per batch,
not per row**. A three-device household is nowhere near the write contention that makes a
single hot document a problem in Convex.

Rejected alternative: ordering by `updatedAt`. That is a *client* wall clock and cannot
totally order two devices; a phone whose clock jumps backwards would silently lose
writes. Rejected alternative: `_creationTime` — it does not move on patch.

The client's cursor is a single integer stored in local `appMeta` under a device-local key
(`syncCursor`). Because one counter spans every replicated table, the pull can merge-sort the
streams into one causally-ordered log.

### Push

1. **Outbox.** A local `outbox` table — `(tableName, localId, enqueuedAt)`, primary key
   `(tableName, localId)` — populated by `AFTER INSERT` / `AFTER UPDATE` SQLite triggers on
   the replicated user tables. Added by a hand-written `drizzle/*.sql` migration (drizzle-kit does
   not generate triggers).

   Triggers, not repo calls, because writes already happen outside the repos:
   `src/data/recurrence-backfill.ts`, `src/data/canonicalize-backfill.ts`, and the App
   Intents drain at `src/lib/use-system-sync.ts:125+`. A repo-level outbox would have to
   touch every one of them and would silently miss the next one.

2. **Drain.** Read up to **500** outbox rows, join out the full current row from its
   table, call `sync.push({ rows })`. On success, delete exactly those outbox rows.
   Idempotent: a row re-pushed with an unchanged `updatedAt` is a no-op at the server.

   500 is chosen against the real Convex per-transaction limits (16 MiB read, 16 MiB
   written, 32 000 documents scanned, 16 000 written, **4 096 index ranges read**, 1 s
   execution excluding DB ops). The binding constraint is index ranges: the mutation does
   one `by_user_and_localId` lookup per row, so 500 leaves an 8× margin.

3. **Durability.** Do **not** rely on `ConvexReactClient`'s in-flight mutation queue — it
   is in-memory and does not survive an app restart. The outbox table is the durable
   queue. This is the whole reason it exists.

### Pull

1. A cheap Convex `useQuery` returns the user's current `syncState.nextSeq`. It is a live
   subscription, so any device's push invalidates it on every other device — realtime for
   free, no polling.
2. When it exceeds the local cursor, call `sync.pullSince({ cursor, limit: 1000 })`. The
   query walks `by_user_and_seq` on every replicated table with `seq > cursor`, merge-sorts by
   `seq`, and returns the first 1 000 rows plus the new cursor.
3. Apply the page in **one local transaction**, then delete any outbox rows it created
   (see §6 for why that is necessary), then write the new cursor. Crash-safe: the cursor
   only advances after the rows land.

### Trigger cadence

Reuse the existing hook shape at `src/lib/use-system-sync.ts`: sync on
`AppState → active`, on outbox-non-empty (debounced ~2 s, same pattern as `publish()`),
and on the `nextSeq` subscription firing. Never on the write path itself.

### First sync of a 10 000-row ledger

- **Adopt (push up):** 10 000 rows ÷ 500 = **20 mutations**. At ~400 bytes serialized per
  transaction row that is ~4 MB total, ~200 KB per call — two orders of magnitude under
  the 16 MiB argument limit. Resumable at any point because the outbox is only cleared
  per successful batch.
- **Replace (pull down):** 10 000 ÷ 1 000 = **10 queries**, ~400 KB each. Well under the
  16 MiB return and 32 000-scan limits.
- Both must show progress and must be interruptible. Neither may block the UI: the app
  stays fully usable against local SQLite throughout.
- Apply order within a page does **not** guarantee that a category precedes a transaction
  referencing it. `seq` is *last-modified* order, so a category edited today has a higher
  `seq` than a transaction created against it last year. The applier must therefore run
  the batch with `PRAGMA foreign_keys = OFF` and restore it after. This is cheap: FK
  enforcement is already opportunistic (`src/db/client.ts`) and the declared cascades
  are already done by hand (`src/data/categories-core.ts`).

### 3.5 Photos — a second channel, not another row in the stream

A JPEG cannot ride the `push`/`pullSince` stream: it would blow the mutation size limit
and stall every other table behind it. So a photo is split.

- **The pointer** is `transactionPhotos.imageKey` — its own replicated table now, superseding
  the single `transactions.imageUri`/`imageKey` pair, which survives for older rows — an
  ordinary replicated column that converges by the same last-write-wins rule as everything else. It is a **key, not a url** —
  `r2.getUrl` mints a SigV4-signed url with a 15-minute default lifetime and re-signs on
  every call, so a stored url is a reference that rots. Reads re-mint.
- **The bytes** move device ↔ R2 directly over signed PUT/GET urls. Only the three small
  calls that mint and account for those urls go through Convex
  (`packages/backend/convex/photos.ts`); the payload never does.

The key is `transaction-photos/<userId>/<device file name>`. The user id half is written by
the server and never accepted as an argument, so ownership is enforced by re-deriving the
prefix from the session. The name half makes the key **derivable rather than allocated**,
which is the only safe retry when the store has no transaction to roll back: an upload that
dies mid-PUT retries onto the same key and overwrites instead of orphaning bytes.

Ordering is chosen for which half is survivable when the two systems disagree — and they
will, because they cannot be made transactional with each other:

| Situation | Outcome |
| --- | --- |
| Row arrives before its bytes | `imageKey` set, `imageUri` null. The identity tile's existing fallback renders. The next photo pass fetches. |
| Upload interrupted | Nothing recorded, bytes possibly half-written. The retry re-derives the same key. |
| Delete races a device mid-download | The GET 404s, the key **stays** on the row, and the next pass retries. Clearing it would make a transient miss permanent loss. |
| Tombstoned row | The object is **kept**. The undo window restores from a tombstone and a device that has not pulled the delete is still rendering it. |
| Release crashes after the metadata row goes | An object leaks. Deliberate: a leak costs storage, the reverse order costs a photo. |

Photo storage is free and ungated, matching replication. A per-account byte limit belongs in
`checkPhotoQuota` in `photos.ts`, before an upload url is minted — the component's metadata
table records `size` per object, so the account total is a `listMetadata` walk. Refusing at
url-mint time is the only refusal a client cannot route around.

**Deployment requires four Convex environment variables**, read by `@convex-dev/r2` itself:
`R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. There is no separate
account-id variable — the component extracts it from the endpoint. The README also tells you
to set `R2_TOKEN`; nothing in the published package reads it.

---

## 4. Conflict resolution

Three rules, in order.

### R1 — A tombstone wins unless the row was restored after it

Every replicated row carries `restoredAt` in its envelope: when it was last lifted from a
tombstone, or null. A version's **era** is `restoredAt` for a live row and
`max(deletedAt, restoredAt)` for a tombstone (null reads as 0). Compare eras first and
the later one wins outright; at the same era a tombstone beats a live row; only then
does R2 run. The rule is `incomingWins` in `packages/backend/convex/lib/syncTables.ts`
and `incomingWinsLocally` in `apps/native/src/data/sync-engine-core.ts`, and both test
files run the same cases.

- Device A deletes at t=10; device B, offline, edits at t=12. B's row has era 0 against
  the tombstone's 10, so the row stays deleted. `updatedAt` never enters into it.
- A restore from Recently Deleted stamps `restoredAt` past the era of the tombstone it
  lifts (`restoreStamp`: now, or the tombstone's era + 1 when this clock is behind), so a
  restore always beats the delete it undoes, on the server and on every device.
- A delete made after a restore wins: its tombstone keeps the row's `restoredAt`, so its
  era is never earlier than that restore, whatever the deleting device's clock says.
- A delete that never saw the restore (made offline on a live copy) is judged by wall
  clock: it wins only if its `deletedAt` is later than the `restoredAt`. A tie goes to
  the tombstone.
- An edit that raced the original delete loses to the restore too (era 0 against the
  restore's), so the restored entry is the one that was deleted, not an edit the
  delete had already beaten.

The era is a total order, which is why tombstones compare on it as well: two tombstones
of the same row are ordered by `max(deletedAt, restoredAt)` before `updatedAt`. That
differs from comparing `updatedAt` alone only for two different deletes of one row, and
it is what keeps the outcome independent of push order.

*Defence.* A deleted expense reappearing on a phone weeks later reads as a
data-integrity bug and silently changes every total that row is in, so nothing but an
explicit restore may beat a tombstone. Before Recently Deleted shipped the rule was
simply "a tombstone is absorbing"; once the app could restore, that rule left a restored
entry live on the one device that restored it and deleted everywhere else.

**What writes `restoredAt`.** `transactionsRepo.restore`: the entry, the card fees
lifted with it, and its installment plans, installments and outside payments
(`restorePlansForTransaction`), all with the entry's stamp. Also the two places a
retired tag link is revived by re-adding its tag (`tagsRepo.setTags`,
`merchant-siblings-core`), which had the same bug. Splits and photos are never
tombstoned with their entry, and a transfer cannot be restored. The local column exists
on those five tables only; the wire and Convex carry it on every table, so a table that
becomes restorable needs the column, the stamp and an entry in `RESTORABLE`. Keeping
the account's ledger over this device's (`discardAccountLedger`) copies the account's
`restoredAt` onto the lifted local row, or the lift would lose on era.

**Builds that predate it.** An old build pushes no `restoredAt` and keeps the absorbing
rule. It rejects a restored row it pulls and moves its cursor past it, so it shows the
entry deleted; its own restores still never land. Migration 0034 sets
`syncRestoresReread` on a device that synced, and the next pull folds it into the
one-time re-read `syncReread` already drives: one walk from the start of the log over
the tables either asks for, after the main walk. Tables `syncReread` names are read
whole; `transactions` and `transactionTags` apply only rows that carry `restoredAt`. A
full cursor reset is not used because it would hand back the tombstone of every entry
restored before the fix. `replaceLocalFromAccount` clears the flag, having just read
the whole log under the new rule.

**Restores made before the fix.** They are live on the restoring device and deleted on
the server. The re-read runs after the main walk has served every tombstone the device
had not read, and a tombstone always won locally under the old rule, so a row live
here against a tombstone in the log was brought back here. When its `updatedAt` is
past the tombstone's `deletedAt`, which a restore always moved it to, the re-read
stamps `restoredAt` and the next push carries the restore. A row an archive restore put
back carries an older `updatedAt` and is left live on this device only, as is a restore
made on a clock running behind the deleter's: both as before the fix. Nothing is deleted
by the repair; the cost is that a restore made before an Erase data on another device
comes back, because the erase skipped it as already deleted.

**Neighbours.** The undo window lives before the write, so it never makes a tombstone.
Recently Deleted has no purge window; tombstones live forever (§8 Q6), so there is no
purge to race. Erase data tombstones live rows with `deletedAt: now`, which beats any
earlier restore. An archive carries `restoredAt` like any other column. A replicated row is
never hard-deleted: the `AFTER DELETE` triggers drop its outbox entry, so the delete never
reaches a peer, which keeps the row and pushes it back on its next write to it (a budget's
period rollover is one). Tombstone instead, as `budgets-core.ts` and `erase-core.ts` do.

### R2 — Row-level last-writer-wins, not field-level

Greater `updatedAt` wins the **whole row**. Equal `updatedAt` breaks on lexicographic
`deviceId`, so both devices independently compute the same winner.

*Defence.* Fields on a transaction are not independently meaningful.
`amount`, `currency`, `date`, `amountUsd`, `exchangeRate` and `exchangeRateType` are a
frozen tuple — `keptCanonical` (`src/data/transactions-core.ts`) exists precisely to
keep them moving together, and its comment spells out that re-deriving the canonical USD
figure later is unsafe. A field-level merge would happily pair device A's new `amount` with
device B's stale `amountUsd`, silently misstating the figure every cross-currency total is
built from. The row is also the unit the user edits: one form, one Save, one `updatedAt`.

### R3 — Invariants Convex cannot hold are restored on the client

- `budgets`: if two non-deleted rows share a `categoryId`, keep the winner by
  (`updatedAt`, `localId`) and release the loser — `categoryId: null` plus a tombstone —
  which then pushes back and converges the other device. Resolved at the write
  (`resolveBudgetCategory`), because the local UNIQUE index would refuse the second row
  before any pass afterwards could run.
- `transactionTags`: same rule on `(transactionId, tagId)` (`resolveTagLink`). The loser
  cannot be released by nulling a column — both halves are NOT NULL — so it is written
  tombstoned, which the partial index accepts, and stays queued so the device pushes its
  own correction.
- `mainBudget`: same, on the whole table, as a reconcile pass after the batch — it is a
  singleton by convention only, so two live rows can coexist long enough to compare.

The tie-break is `keepsTheSlot` (`src/data/sync-engine-core.ts`): later `updatedAt` wins,
then the greater id. Both devices hold the same pair and so pick the same survivor, which is
the only property the rule needs. They are the client's job because they are *local*
constraints (`src/db/schema.ts`, `src/data/budgets-core.ts`) and because tombstoning
through the normal path keeps the tombstone in the same replication stream as everything
else.

---

## 5. Identity of a row across devices

**Local ids are usable as global keys. No separate sync id is needed.**

`newId()` (`src/domain/ids.ts`) returns a v4 UUID from WebCrypto or `expo-crypto`.
Every user table's primary key is one (`src/db/schema.ts`, `:44`, `:103`, `:128`, `:150`),
minted on the device before the row is ever saved, so collision across devices is not a
practical concern and a row keeps its identity from creation through a first sync that may
be months later. That is exactly the property a sync id would have been introduced to
provide. The Convex `_id` is an implementation detail of the replica; `localId` is the key.

One real caveat, and it is not solved by ids:

**Seeded categories get fresh UUIDs on every device.** `seedCategories`
(`src/data/categories-core.ts`) calls `newId()` per seeded row at first launch
(`src/data/bootstrap.ts`). Device A's "Groceries" and device B's "Groceries" are
therefore *different rows* with the same name. A naive merge produces a doubled default
category list on the second device. This is why case 1 in §1 is **replace, not merge** —
wiping the untouched local store is what makes the second device inherit the account's
categories instead of stacking its own on top. Do not try to reconcile them by name.

---

## 6. Two things that had to change before push was correct — both landed in S4

Kept because the reasoning still explains why the write path looks the way it does.

1. **`eraseData` used to hard-delete.** A hard delete leaves no tombstone, so the next pull
   would resurrect the entire erased ledger. It tombstones now: `src/data/erase-core.ts`
   writes `{ ...ERASED_TRANSACTION, deletedAt: now, updatedAt: now }` rather than
   `db.delete`, which no longer appears in that path at all. (Readers already filtered
   `isNull(deletedAt)`, so this was a change of write, not of read.)

2. **`categoriesRepo.remove` used to hard-delete its cascade.** Same problem, same fix:
   `src/data/categories-core.ts` now stamps `deletedAt` on the category's transactions, its
   budgets, its child categories and the category itself.

And one hazard the applier must design around:

3. **The applier must invalidate explicitly — but not for the reason previously recorded.**
   An earlier note at `src/lib/use-system-sync.ts` claimed writes inside a Drizzle
   transaction do not reach `addDatabaseChangeListener`, citing an instrumented pull that
   wrote 12 588 `exchangeRates` rows while the listener saw nothing. **That diagnosis is
   wrong and has been retracted.** Those writes were never in a transaction:
   `drizzle-orm/expo-sqlite/session.js:31-42` builds the transaction in `"sync"` mode and
   never awaits an async callback, so `begin; commit;` fired empty and every statement ran
   outside the boundary. The listener stayed quiet because `exchangeRates` is not in
   `WATCHED_TABLES` and `useLiveQuery` only re-reads on writes to its own table.

   sqlite's update hook is per-connection and per-row and fires **regardless** of
   transaction state (`expo-sqlite/ios/SQLiteModule.swift:543-563`; `src/db/client.ts`
   opens with `enableChangeListener: true`), and `withTransaction`
   (`src/db/transaction.ts`) shares the Drizzle connection. So an applier writing through
   `withTransaction` *will* trip the listener.

   Invalidate explicitly anyway. Relying on a per-row native hook to repaint a bulk apply is
   implicit and order-dependent; a deterministic `invalidate(tableName)` broadcast in
   `live-query.ts`, fed by both the change listener and the sync applier, is the right
   design. Build it in the same slice as the applier, with a test — just do not justify it
   with the retracted claim.

Also note: the outbox triggers will fire on the applier's own writes. The applier must
delete the outbox rows it caused **inside the same transaction** — that is atomic and
avoids any need for trigger-suppression cleverness, and it stops a pull→push echo loop.

---

## 7. Staging

Ordered. Each slice leaves the app working and is independently shippable. "Unattended"
means an agent can build and verify it without the owner; "needs owner" means it is blocked
on credentials, a native rebuild, a second physical device, or product copy.

Every slice below has landed. The table is kept because it records what each one covered
and why it had to come in that order.

| # | Slice | Size | Attended? |
|---|---|---|---|
| **S1** | **Convex schema + this document.** *(this PR)* | S | unattended |
| **S2** | **Auth backend.** Port `auth.ts`, `auth.config.ts`, `http.ts`, `app.use(betterAuth)`; add `@convex-dev/better-auth`, `better-auth`, `@better-auth/expo`, `jose`; add a `@outlayr/env/backend` module (this repo only has `packages/env/src/native.ts`). No client change. | M | **needs owner** — Apple team/key/bundle + Google web+iOS client ids and secret, `SITE_URL`, `NATIVE_APP_URL`, and a Convex deployment to set them on |
| **S3** | **Auth client + sign-in surface.** `src/lib/auth-client.ts`, swap `ConvexShell` → `ConvexBetterAuthProvider`, Apple + Google buttons, Settings → Account row. App fully usable signed out. | M | **needs owner** — three new native modules ⇒ dev-client rebuild, and OAuth cannot be verified on a simulator |
| **S4** | **Tombstone the two hard-delete paths** (§6.1, §6.2). Pure local, TDD, no network. Ships value alone. **Must precede any push.** | S | unattended |
| **S5** | **Outbox.** Drizzle migration adding the `outbox` table + `AFTER INSERT/UPDATE` triggers on the replicated tables; device-local `syncDeviceId` / `syncCursor` meta keys. No network. | M | unattended |
| **S6** | **Push.** `packages/backend/convex/sync.ts` `push` mutation (auth-scoped, seq stamping, 500-row batches) + the client drainer. Signed-in only, no-op signed out. | M | unattended to build; **needs owner** for the first real end-to-end run |
| **S7** | **Pull + apply.** `pullSince` query, one merge-sort across the replicated streams, transactional apply with FKs off, R1/R2/R3 from §4, outbox self-cleanup, cursor advance, plus the `live-query.ts` invalidation fix from §6.3. | **L** | unattended to build; **needs owner** for two-device verification |
| **S8** | **First-sign-in adoption.** The three-way decision from §1, the "Keep this iPhone's / the account's / both" prompt, and initial-sync progress UI. | M | **needs owner** — product copy and the destructive-choice UX |
| **S9** | **`appMeta` preference sync.** `currency`, `currencyChosen`, and the account-scoped settings; explicit device-local deny-list. | S | unattended |
| **S10** | **Settings Sync row.** Replace the placeholder with real status: signed-in account, last synced, pending count, sign out. | S | unattended (after S3) |
| **S11** | **Photo sync** via Cloudflare R2 (`@convex-dev/r2`), not Convex file storage. Key replicates on the row; bytes move out of band. | M | built — **round trip unverified**, the four `R2_*` environment variables are not provisioned yet |

Recommended build order when parallelising: **S4 and S5 can start immediately and in
parallel with S2/S3** — they are local-only and unblock S6/S7 regardless of when auth
lands. S7 is the one genuinely large slice and should not be combined with anything.

---

## 8. Questions for the owner — with a recommendation for each

**Resolved since this was written:** Q1 shipped — `src/data/recurrence-backfill.ts` derives the
child id with `uuidV5` from `@/domain/uuid5`, so both devices compute the same id. Q3 shipped
paid — `packages/backend/convex/sync.ts` calls `requirePro` in both the `push` and `pullSince`
handlers, which is where the recommendation said the check belonged. Both are kept below for
the reasoning; neither is still open.

1. ~~**Does recurrence materialization need to be sync-aware?**~~ *(resolved — see above)*
   `src/data/recurrence-backfill.ts` mints child transactions locally with fresh UUIDs. Two
   synced devices will each mint their own for the same recurring parent, producing
   duplicate charges — the single worst-feeling bug this subsystem can ship.
   **Recommendation: make the child id deterministic** — derive it from
   `(parentLocalId, occurrenceDate)` via a UUIDv5-style hash instead of `newId()`, so both
   devices independently compute the same id and the second one upserts rather than
   inserts. Cheap, no coordination, no server involvement. Fold into S7. *(The recurrence
   handover and orphan repair, #116/#117, landed in PR #153 — read
   `src/data/recurrence-backfill.ts` as it stands now before changing id generation there.)*

2. **Do budgets and the rest sync at all, or only transactions and categories?**
   **Recommendation: sync them all, as designed.** *(resolved: fourteen tables do — §2.)* A budget that does not follow you to your
   iPad is a bug report, and the marginal cost over transactions is near zero.

3. ~~**Is sync a paid feature?**~~ *(resolved: paid — see above)*
   The repo is open-core with a proprietary backend and RevenueCat is already in the
   product plan. Every Convex function in S6/S7 would need an entitlement check, and that
   check has to exist *before* users have data on the server — retrofitting a paywall onto
   an already-synced ledger is much worse.
   **Recommendation: decide now, gate at S6.** If it is paid, the entitlement check belongs
   in the `push`/`pullSince` handlers, not the client.

4. **Which `appMeta` keys are account-scoped?**
   **Recommendation: `currency` and `currencyChosen` sync; everything under the Settings
   screen's "This device" heading (`src/screens/settings/index.tsx`) plus `firstLaunch`
   does not.** The UI already draws that line; follow it. Revisit only if the owner disagrees
   with the existing grouping.

5. **Should sign-in be offered during onboarding, or only in Settings?**
   **Recommendation: Settings only, for now.** Onboarding already has 17 screens and a
   paywall; adding an auth step before the user has any data to protect raises abandonment
   for no benefit. Add "Sync across devices" to onboarding once S7 is proven.

6. **How long do tombstones live?**
   They accumulate forever in both stores as designed.
   **Recommendation: leave them.** A heavy user at 10 000 rows over years is a few MB. Add a
   cron-based purge only if it ever measures. Purging early is how you get resurrections.

7. **What is the sync failure UX?**
   **Recommendation: silent-and-retrying by default**, with the state visible in the
   Settings Sync row (S10) and nothing modal. The app is local-first; a failed sync is not a
   failed save, and telling the user otherwise trains them to distrust a ledger that is
   actually fine.

---

## The Settings row

It began as an inert `LinkRow` reading "iCloud Sync / Not available", renamed to "Sync"
with this design because "iCloud" named a backend this product will never use. S10 replaced
it with the live status it shows today.
