# Library traps

Library behavior that breaks code far from where we first hit it. Each entry names the file that already works around it.

## SQLite and Drizzle

- **`db.transaction()` commits empty.** On expo-sqlite Drizzle builds it in sync mode and commits without awaiting the callback (`drizzle-orm/expo-sqlite/session.js:31-42`), so an async body runs outside any transaction. Use `withTransaction` (`apps/native/src/db/transaction.ts`); `outlayr/no-drizzle-transaction` bans the call.
- **`withExclusiveTransactionAsync` opens its own connection.** The Drizzle client never uses it, so Drizzle statements land outside the transaction. `withTransaction` uses `withTransactionAsync`, which shares the connection, and queues callers because a second overlapping `BEGIN` fails and its catch rolls back the first caller.
- **`ON DELETE` never fires.** `foreign_keys` is off on the connection, so cascades are written by hand (`apps/native/src/data/categories-core.ts`).
- **An unqualified `DELETE FROM <table>` is invisible.** SQLite's truncate optimization skips the update hook behind `addDatabaseChangeListener`, so live queries (`apps/native/src/data/database-changes.ts`) never hear about the wipe. The exchange-rate refresh signals through `apps/native/src/data/rates-revision.ts` instead.
- **drizzle-kit drops triggers.** It neither generates nor diffs them, and a change it implements by rebuilding a table drops every trigger on it. A migration that recreates a replicated table re-declares its outbox triggers by hand (`apps/native/src/db/schema.ts`).
- **No ANALYZE.** SQLite then takes `col IS NULL` for a selective probe, so a full index on a mostly-null column beats the `date` indexes on every live-row query. Index such columns with a partial index.

## Styling

- **Opacity modifiers on theme colors.** Uniwind compiles `bg-tint/13` to `color-mix(in srgb, unset 13%, transparent)`, which is rejected at runtime. Mix the alpha in code (`apps/native/src/components/sentence/sentence-wash.tsx`) or declare a literal token (`--rail-over` in `apps/native/global.css`).
- **`withUniwind` runs once per component.** Every wrapper lives in `apps/native/src/components/styled.ts`; React Native and Reanimated components take `className` already. A wrapped `GlassView` renders no glass at all: import it from `expo-glass-effect` and size it with `style`.
- **tailwind-merge doesn't know our text sizes.** It files every unknown `--text-*` token as a color, so `cn("text-body", "text-danger")` drops the size. `apps/native/src/components/tw.ts` declares the sizes through `extendTailwindMerge`; `tailwind-variants`' `cnMerge` accepts `twMergeConfig` and ignores it.
- **PanelUI's disabled dim never lands.** Its `AnimatedPressable` writes `opacity` every frame, which beats a static class (other classes apply). Dim a wrapper instead (`apps/native/src/components/editor-cta.tsx`).

## Native UI

- **`@expo/ui`'s SwiftUI `List` is not virtualized.** It mounts every child: 165 currencies took one ~550ms commit. Long lists use a virtualized list (`apps/native/src/components/currency-picker-list.tsx`).
- **Android sheets keep their detents.** react-native-screens keeps the detents a sheet was created with; declaring one where it had two and swiping down crashes ("Invalid state 4 for detentCount 1"). See `apps/native/src/lib/sheet-detents.android.ts`.

## Routing and build

- **expo-router never drains the launch URL.** expo-linking's launch-URL registry stays readable for the life of the process, so a dev reload lands back on the launch destination. `apps/native/src/lib/deep-links.ts` drains it.
- **Intlayer blocks `*.content.*` in Metro.** A value import resolves under tsc and tsx, then fails to bundle; it once reached a device build. Import content files as types only (`apps/native/src/i18n/catalog.ts`).

## Convex

- **An unsharded rate limiter throws OCC conflicts.** `shards: 10` is load-bearing (`packages/backend/convex/enrichment.ts`, `csvImport.ts`).
- **A query can serve an expired signed URL.** Convex caches query results, so `photos.readUrls` is a mutation though it writes nothing.
