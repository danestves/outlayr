# App meta registry

App meta is the native app's key-value store, the `appMeta` table. Every meta key is declared once in
`apps/native/src/data/app-meta-registry.ts`: its stored name, its schema, what a missing row reads as, and
its sync scope (`synced` or device-local). Reads and writes go through `Meta` in
`apps/native/src/data/app-meta-core.ts`. A name the registry does not hold is a type error.

## Rules the source cannot say

- **The property name is the stored name.** Renaming a key orphans the row on every install. Changing what
  a key stores needs a schema that still reads the old text, or a migration.
- **Schemas live in a leaf file.** `domain/meta-values.ts` imports nothing from `data/`, `lib/` or `state/`.
  Every feature reads the registry, so an import from that file back into one closes a cycle, and the
  registry stops loading under vitest.
- **Sync scope is the allow-list.** `Meta.syncedNames` is derived from the registry and feeds the outbox
  triggers and the pull. Flipping a key's scope changes what replicates; see
  [Convex sync](./convex-sync.md) for what a newly synced key does and does not push.
- **Absence can be an answer.** A missing row reads as the key's default, so a feature that asks "did the
  person ever choose" uses `Meta.has`, not `Meta.get`. `showNotifications` and `installmentReminders` do.

## A corrupt value

A corrupt value is stored text its key's schema rejects.

| Where it is read | What happens |
| --- | --- |
| `Meta.get` (Effect) | The row is deleted, the read fails with `CorruptMetaError`, and the next read returns the default. |
| A list key | The elements that decode are kept and written back; the rest are dropped and reported. The read succeeds. |
| A hook or live query (`Meta.decode`, `useMeta`) | The render gets the default. It never throws and never writes. |
| A pulled row (`Meta.check`) | The row is skipped and the rest of the page applies. This device's own value is left alone. |

Every case is reported with the key name and the kind of failure, through `Effect.logWarning` or one
`console.warn` per launch. A report never carries the stored value: these values include wallet cards,
notification texts and merchant names. `CorruptMetaError` has a `key` and no `cause` for the same reason.

### The heal must outlive the transaction that hit it

The failing read usually fails the transaction around it, and a rollback would put the corrupt row back,
so the next read would fail again, forever. The heal is an idempotent `DELETE` that also registers itself
with `afterRollback` (`db/transaction.ts`); `withTransaction` runs it again once the rollback is done.
`bootTransaction` has no such hook, so do not read a key that can be corrupt inside one.

### A healed synced key does not push

The heal deletes the row instead of writing the default. The `appMeta` delete trigger drops the key's
outbox entry in the same statement, so the reset stays on this device and the account's value comes back
the next time another device changes it.
