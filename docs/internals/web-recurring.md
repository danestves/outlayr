# Web recurring

The Recurring page reads schedules straight off the ledger: every transaction with a recurring type is a
chain, and its back-filled occurrences are its history. The model is `apps/web/src/lib/recurring.ts`; the
rows it writes come from `apps/web/src/lib/recurring-writes.ts`.

## What is stored where

- **Schedules are transactions.** Create, edit, log, skip, stop and restart write the same rows native
  writes, so both apps agree on every chain.
- **Pauses and dismissed suggestions are one synced `appMeta` row**, key `recurring`, holding JSON. Native
  does not read it: the pull keeps only the keys in the [app meta registry](./app-meta.md).
- **Native has no pause.** Pausing really stops the chain, and a dated pause writes its resuming charge at
  once. A phone shows the chain as ended until that charge, and resuming on the web restarts it.
- **The last writer wins the whole row**, as with [web rules](./web-rules.md).

## Known edges

- Skip drops every charge still due, not only the oldest: the chain can only move past a date by logging it. With more than one due, the button says how many it skips.
- Logging a due charge drops the due charges older than it.
- A pending carrier with a card fee loses the fee when it is paused and resumed.
- Detection groups entries by merchant, kind and currency, and skips a merchant that already has a chain.
  A dismissed suggestion stays dismissed for that group, whatever its amount or cadence does later.
