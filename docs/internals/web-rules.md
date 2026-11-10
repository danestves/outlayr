# Web rules

Rules file new entries by merchant, description or amount. They live on the web for now: the engine is
`apps/web/src/lib/rules.ts` and the rows it writes come from `apps/web/src/lib/rule-writes.ts`.

## Where the rule book is kept

The whole book (rules in order, dismissed suggestions, settled conflicts) is one synced `appMeta` row,
key `rules`, holding JSON. No table and no migration.

- **Native does not read it.** The pull keeps only the keys in the [app meta registry](./app-meta.md)
  and skips the rest, so the row passes through a phone untouched. Native applies no rules until the key
  is registered there with the same schema.
- **The last writer wins the whole book.** Two tabs editing different rules at once keep one edit. Split
  the row per rule before rules get edited from two places at a time.
- **Text the schema rejects reads as no rules**, and the next save replaces it. A schema change must keep
  reading the stored text.

## What a rule can and cannot know

- An entry carries no record of who chose its category. "Skip entries that already have a category" is
  the closest honest switch to "entries I set by hand", and a suggestion counts every filed entry of a
  merchant. Telling the two apart needs a source field on the transaction.
- The first matching rule sets the category. Tags add up across every matching rule.
- A rule whose category was deleted, or whose category is the wrong kind for the entry, is passed over,
  not applied. A deleted tag is dropped from the outcome.

## Tags

- `ledger.tags` and `ledger.transactionTags` are Pro reads, like the rest of the ledger sync. The web
  preloads both, so they must be deployed before a web build that asks for them.
- One link row per entry and tag. Tagging a pair that was untagged before revives its row with a later
  `restoredAt`, as native does (`tags-core.ts`). Native holds a unique index on live pairs
  (`transactionTags_pair_idx`), and one row per pair is what keeps a pull from ever colliding with it.
