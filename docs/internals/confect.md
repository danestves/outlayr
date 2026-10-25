# Confect backend layout

The backend source lives in `packages/backend/confect/`. Convex still deploys `packages/backend/convex/`, but `confect codegen` writes most of it.

## Who owns what

| Path | Owner |
|---|---|
| `confect/tables/<name>.ts` | Hand-written. One Effect Schema table per file; the filename is the table name. |
| `confect/<group>.spec.ts`, `<group>.impl.ts` | Hand-written. A function group's declaration and its implementation. |
| `confect/<group>.ts`, `confect/lib/` | Hand-written. Handlers that have not moved to Effect yet, and shared helpers. |
| `confect/_generated/` | `confect codegen`. Committed. |
| `convex/<group>.ts`, `convex/schema.ts` | `confect codegen`. Committed. Each re-exports from `confect/_generated`. |
| `convex/http.ts`, `crons.ts`, `auth.config.ts`, `convex.config.ts` | Hand-written. Codegen keeps these names and leaves them alone while `confect/` has no file of the same role. |
| `convex/_generated/` | `convex codegen`. Committed. |

Codegen deletes every other `.ts` file in `convex/`, so nothing hand-written can live there under a new name. CI regenerates both `confect/` and `convex/` and fails on a diff, so run `vp exec confect codegen` in `packages/backend` after touching a table, spec or impl. `vp run dev` keeps them in sync while it runs.

## Groups

A group starts as plain functions: `<group>.ts` holds the Convex `query`/`mutation`/`action` definitions, the spec declares each one with `FunctionSpec.convexPublicQuery<typeof fn>()("name")` and friends, and the impl hands them to `FunctionImpl.make` untouched. Paths, args and returns stay what Convex sees today.

Moving a group to Effect rewrites its spec (schemas for args and returns) and its impl (Effect handlers); the file names and function paths stay. `exchangeRates` is the first group done this way. An Effect function always has a returns validator, so a converted query that had none gains one.

## Schema equivalence

The tables in `confect/tables/` export the same schema the hand-written `convex/schema.ts` did: deep-equal once key order is ignored, same table and index names, same index field order. A push to a local backend reported no index or table changes. Object keys come out in a different order, so a raw JSON diff of `schema.export()` is not a useful check.

## Traps

- **A nested `NullOr` inside a union compiles to a nested union.** Convex then sees a different validator. Write `Schema.Union([A, B, Schema.Null])` flat (`confect/tables/accountDeletionJobs.ts`).
- **`compileSchema` reverses object keys.** Validators built from Effect structs (`confect/sync.ts`, `confect/lib/enrichmentResult.ts`) validate the same values but print in reverse order. It also only types against a concrete struct, so call it per struct rather than through a generic helper.
- **convex-test needs `_generated` in its module map.** Tests live beside their modules in `confect/`, so they glob `../convex/**/*.ts` (`../../convex/**/*.ts` from `lib/`).
- **Vitest's default include matches `*.spec.ts`.** `vitest.config.ts` narrows it to `**/*.test.ts`; a spec is a group declaration, not a test.
- **Native Jest does not transform `@confect`.** `apps/native` tests import `confect/lib/syncTables.ts`, so that file imports only `effect`; `compileSchema` stays in `sync.ts`.
- **`confect/auth.ts` is a reserved slot.** Codegen would emit `convex/auth.config.ts` from it, so the Better Auth module is `confect/lib/betterAuth.ts`. `http.ts` and `crons.ts` are reserved the same way.
- **`convex codegen` needs a deployment.** `confect codegen` runs offline, which is why `check-types` (plain `tsc`) works on a clean checkout. Regenerating `convex/_generated/` needs a dev or local deployment; its output does not depend on which one.
- **`skipLibCheck` hides a stale `convex/_generated/api.d.ts`.** An import of a removed module there type-checks fine. Regenerate it whenever a module is added or removed under `convex/`.
- **`confect dev` and `convex dev` race at startup.** The first writes temporary `convex/.confect-artifacts-*` files that crash the second's first push. `dev` runs `convex dev --start "confect dev"` so Confect starts after the first push.
- **Effect's clock reads 0 inside a query.** Confect gives queries a `Clock` whose unsafe accessors return 0, so logs, spans and `Effect.timed` never evict the query from the cache. Read the time with `Clock.currentTimeMillis`, which is real and evicts it like `Date.now()` does.
