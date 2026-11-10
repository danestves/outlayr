# Outlayr

An expense tracker whose ledger lives on the device first and syncs between a person's devices and the web app.

## Language

### Writing to the ledger

**Ledger commit**:
One logical change to the ledger, shown at once and then sent to the server. It ends as saved or failed, and a failed commit leaves nothing behind.
_Avoid_: save, mutation, push

**Held commit**:
A ledger commit that is shown but not yet sent, so the person can undo it. It is sent when its undo window closes or the page goes away.
_Avoid_: staged rows, pending delete

**Unsent rows**:
Rows of a ledger commit that have been shown but have no answer from the server yet. They outlive the page and are sent again on the next load.
_Avoid_: outbox (web), queue

**Notice**:
What the person is told about a ledger commit on the web: that it was saved, that it failed, or that it can still be undone.
_Avoid_: toast (for the message), alert

**Entry draft**:
The plain values an entry is committed from, whichever screen gathered them: the form, a scanned receipt or a spoken entry.
_Avoid_: form values, payload

**Pending write**:
An entry captured outside the app (a notification, a shortcut, the wallet, the watch) that waits to be filed into the ledger.
_Avoid_: queued entry, autolog write

**Pending write decision**:
What happens to one pending write: it is filed as a new entry, skipped as a duplicate, merged into the entry for the same charge, settled against a subscription's charge, held for the autolog cap, or dropped when nothing can categorize it.
_Avoid_: dedupe result, apply step

**Wallet state**:
What the device remembers about wallet capture: the cards it has seen, the last wallet entry, recent notification texts and repriced subscriptions.
_Avoid_: wallet meta, autolog state

**Autolog**:
The feature that files entries from wallet payments and bank notifications without the person opening the app, and the cap on how many it files.
_Avoid_: pending writes (for the feature), auto-log

### Reading the ledger

**Books**:
The ledger's rows held in memory, one list per table. The web app's screens read from the books and never wait on the server.
_Avoid_: store, cache, state

**Ledger view**:
The pure code that turns books into what a screen or an MCP tool shows: balances, the log, budgets, the overview.
_Avoid_: selector, read API, dashboard query

### Deleting

**Tombstone**:
A row marked deleted and kept, so the deletion reaches every device. A synced row is never removed outright.
_Avoid_: soft delete, hard delete

**Deletion plan**:
Every row that goes with a deleted entry, transfer, account or category: its fees, transfer legs, installment plans and payments, and an account's or category's own budgets, goals and adjustments. It also names what stays but is detached: a deleted account's entries, a deleted category's subcategories.
_Avoid_: cascade, cleanup

### Settings and device memory

**App meta**:
The key-value memory of a device: settings, sync bookkeeping and feature state that is not part of the ledger.
_Avoid_: settings (for the whole store), preferences, config

**Meta key**:
One named value in app meta, with a fixed stored name, a shape, a default and a sync scope.
_Avoid_: setting key, flag

**Sync scope**:
Whether a meta key follows the person to their other devices (synced) or stays on this one (device-local).
_Avoid_: synced flag, shared

**Corrupt value**:
A stored meta value that does not fit its key's shape. Reading it fails once, and the key returns to its default on this device only.
_Avoid_: invalid setting, bad JSON

### Time

**Calendar day**:
The day an entry is filed on, stored as midnight in the ledger zone.
_Avoid_: date, timestamp

**Ledger zone**:
The time zone a ledger's calendar days are counted in. On a phone it is the device's zone; the web app and the server use the zone the phone last reported.
_Avoid_: user time zone, local time

**Ledger calendar**:
The rule that names the calendar day and month an instant is filed on. The phone uses its own clock; the web app and the server count in the ledger zone.
_Avoid_: date helper, start of day

### AI

**AI gate**:
The one check every AI feature passes before a model exists: a signed-in caller, the current AI consent, and the feature's own limits. A request that fails it is refused with a named reason.
_Avoid_: capture gate, guard, auth check

### Sync

**Outbox**:
The device's list of local rows that have changed and still need to reach the server.
_Avoid_: queue, pending sync
