# Ledger cells: balances without reading every row

A balance is a sum over every money row an account ever had. The phone sums in SQLite and is fast. The web has no local copy, so a page that shows one balance had to pull the whole ledger first. `ledgerCells` is the server's sum, kept so a page can read balances from a document a month.

Nothing reads the cells yet. They are built per user on request, and until a ledger is built the code below does nothing for it.

## What a cell is

`ledgerCellsOf` (`packages/money/src/ledger-cells.ts`) folds live rows into cells keyed by place, UTC day, currency and direction. A place is a leg plus a ref:

| Leg              | Rows                         | Ref     |
| ---------------- | ---------------------------- | ------- |
| `flow`           | transactions with an account | account |
| `outbound`       | transfers, source side       | account |
| `inbound`        | transfers, receiving side    | account |
| `outsideMove`    | outside moves                | account |
| `outsidePayment` | outside payments             | order   |

An outside payment names its order, not an account, because the order can change accounts later. The reader resolves it.

The table (`confect/tables/ledgerCells.ts`) holds one document per user per UTC month. It is not a synced table: no `seq`, no pull, never on a device. The rows stay the truth and the cells can be dropped and rebuilt at any time.

## The rule that keeps them right

A day's cells are recomputed from that day's live rows. They are never adjusted by the difference a write made. So the upkeep after a write and a full rebuild run the same function over the same rows, in `seq` order, and write the same floats. `ledgerCells.test.ts` holds that through edits, moves, deletes and restores.

Every server-side write to `transactions`, `transfers`, `outsidePayments` or `outsideMoves` must call `scheduleCellRefresh` with the row's date, and with its old date when it moved. Today that is `sync.push` and `mcpEntries`. A writer that skips it leaves a wrong balance on the web that nothing will correct.

The refresh runs in a scheduled mutation after the write, not inside it. The cells are a cache, and no read limit or bug of theirs may fail a push. For a moment after a write the cells lag the rows.

## State

`syncState.cells` is `{ building, run, version }`:

- Absent: never built. Writes schedule nothing.
- `version` other than `LEDGER_CELLS_VERSION`: built by older code. Writes schedule nothing, and a reader must rebuild before it trusts them.
- `building: true`: a rebuild is running, or one died, or a month outgrew a document. A reader must use the rows.
- `building: false` at the current version: the cells match the rows.

`ledgerCells.rebuild` with `step: null` drops the user's cells, sets `building`, and walks the ledger one month a step, each step scheduling the next, so any ledger fits a mutation's read limits. Writes that land during the walk refresh their own days, and the walk overwrites those months from the rows when it reaches them. `run` counts rebuilds: a step whose run is no longer the current one stops, so starting over a stuck rebuild is safe.

Bump `LEDGER_CELLS_VERSION` when a cell changes shape or meaning.

## Why not the Convex aggregate component

`@convex-dev/aggregate` keeps one sum per aggregate under one key per document. A cell needs four sums (amount, USD amount, unconverted amount, count), a transfer is two places, and the day's rate needs a sum per day, which is one range call per day. A user's ledger is small enough that forty month documents read faster than that tree, and the component needs its own backfill either way.
