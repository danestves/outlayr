# Linting and formatting

Vite+ runs **oxlint** (lint) and **oxfmt** (format) from one config. The `lint` block in `vite.config.ts` extends `ultracite/oxlint/{core,react,tanstack,anti-slop}`; the jest and vitest presets are re-anchored into `overrides` rather than extended (see below); the `fmt` block spreads `ultracite/oxfmt`. Both keep only what genuinely differs from those presets.

Ultracite is still the preset source, but no longer the CLI: the entry point is `vp`, which reads those two blocks.

```bash
vp check --fix   # format + autofix
vp check         # report only
```

Pre-commit runs `vp staged`, which applies `vp check --fix` to staged files and re-stages what it rewrites, so a lint error blocks the commit rather than half-applying it; the Claude Code hook runs `vp check --fix`. Pre-push (`.vite-hooks/pre-push`) runs `vp run -r --cache check-types` and then only the tests related to files changed since `origin/main`. It never runs `vp check`. The CI workflow (`.github/workflows/ci.yml`) runs `vp check` on every pull request, plus `check-types` and the tests of each package the diff touches and of the packages that depend on it. Changes outside `apps/` and `packages/` other than docs run every package, and so do pushes to `main`. Its `Check` job fails when any other job fails.

The gate is green: **no errors and 6 warnings**, all extra-dependency findings from React Compiler rules that are `warn` rather than `error` — see "Warnings, not errors" below.

The test-file scope was re-derived from scratch in August 2026: every carve-out was deleted, the full 3,130 findings were worked through, and each rule that went back off carries the count it reported and what fixing it actually cost. See "How the test scope was measured".

Formatting is **4-space indent, 120 columns**. oxfmt also formats CSS, so `global.css` is covered by the same gate as the TypeScript — it no longer drifts outside every hook the way it did under Biome. `*.md` and `*.html` are excluded: `proseWrap: "never"` would rejoin every wrapped paragraph in `docs/`, and the HTML generators are reviewed as rendered pages.

---

## Fixes that are not safe here

`oxlint --fix` writes without asking, so a rule whose fix is unsound is worse than a rule that is merely noisy. Each of these was caught by `tsc` or by a red test during the Biome → oxlint migration, and each is **off** in the `lint` block of `vite.config.ts` for that reason:

| Rule | What its fix did |
|---|---|
| `unicorn/no-useless-undefined` | Dropped the argument, not the value — `mockResolvedValue(undefined)` became an arity error, and `interpolate("Hello", undefined)` stopped testing the thing it exists to test. |
| `unicorn/catch-error-name` | Renamed the caught binding to `error` *and* rewrote the shorthand property built from it, so `catch (cause) { failure = { cause } }` silently became `{ error }`. |
| `unicorn/prefer-set-has` | Swapped the array literal for `new Set(…)` and left the `: string[]` annotation and the `.includes` call sites behind. |
| `vitest/prefer-describe-function-title` | Substituted the binding for the string title — `describe("crons", …)` → `describe(crons, …)`, a type error for any subject that is a value rather than a function. Four in `packages/backend` on the run that re-enabled it. |

One more is suppressed at its single call site rather than disabled: `jest/prefer-mock-return-shorthand` rewrites `mockImplementation(() => v)` to `mockReturnValue(v)`, which evaluates `v` at setup — and `device-language.test.ts` passes a `fn` that throws, to exercise the failure path.

If you re-enable any of these, run `vp run -r --no-cache test` and `vp run -r --no-cache check-types` before staging the result. `--no-cache` matters: the root `test` and `check-types` scripts pass `--cache`, so a plain `vp run test` can replay a cached run instead of executing one.

## Rules we rejected

**`no-eq-null` / `eqeqeq` on null.** `x == null` is the nullish check, not a lazy `===`: `undefined == null` is true, `undefined === null` is false. 63 files use the `!= null` counterpart. Relaxing `eqeqeq` alone is not enough — `no-eq-null` flags the same 462 sites on its own.

**`func-style` and `react/function-component-definition`.** Components and helpers are declared with `function` throughout and the tree relies on hoisting (`RootNavigator` references `RouteGate` above its definition). That is 2000+ declarations; converting them is an idiom change, not a toolchain migration.

**`unicorn/prefer-module`, `node/global-require`.** Metro resolves `require()` for static assets and for the native modules that must not load at import time.

**`react/jsx-handler-names`, `react/style-prop-object`, `unicorn/no-array-reduce`.** Three DOM assumptions that do not survive React Native: `style` here is a Skia `Path` mode (`style="stroke"`), handlers are named for what they do (`onPress={openSheet}`), and `.reduce` is how the aggregates in `domain/` are written.

**`require-unicode-regexp`, `prefer-named-capture-group`.** Adding the `u` flag switches escape handling and `\w` semantics for every regex in the CSV, currency and i18n parsers at once.

**`unicorn/no-array-sort`, `unicorn/no-array-reverse`.** In-place `.sort()` / `.reverse()` is deliberate on arrays the code just built, and call sites spread first where the input is shared. `.toSorted()` / `.toReversed()` are a different allocation and a different Hermes baseline than the tests, which run on node, would catch.

**`require-await`.** Every site is a callback satisfying a Promise-returning contract (`photos: async () => clearStoredPhotos()`, a Convex `handler`). Dropping `async` turns a synchronous throw into a thrown error where the caller handles a rejection.

**`unicorn/prefer-number-coercion`.** `Number()` is not `parseFloat()`: the CSV importer and the numpad both rely on a trailing-garbage cell parsing to its leading number rather than to `NaN`.

**`react/hook-use-state`.** Two deliberate shapes, 15 sites: `const [seed] = useState(() => …)` takes a render-stable snapshot and wants no setter, and `const [x, setXState] = useState(…)` names the raw setter apart because the exported `setX` does more than assign.

**`promise/avoid-new`.** The four sites are the promise primitives themselves — a timer bridge for `yieldToUi`, and a hold that never settles so a committed CTA cannot re-enable.

**`promise/prefer-await-to-then`, `promise/prefer-await-to-callbacks`.** 90 promise chains and 44 callback APIs predate this gate.

## Rules we scoped

| Scope | Rules | Why |
|---|---|---|
| tests, `**/test-*.ts`, `**/test.helpers.ts`, `apps/native/jest/**`, `**/scripts/**` | 25 rules, plus the six `outlayr/*` design rules in a second block, all listed in `vite.config.ts` | Node-side code, not app code. See "How the test scope was measured". |
| `packages/backend/convex/**` | `unicorn/filename-case` → camelCase | In Convex the filename **is** the API path: `convex/exchangeRates.ts` is `api.exchangeRates.get`. Kebab-casing would rewrite every client call site. |
| `packages/backend/convex/**` | `unicorn/prefer-at` | Convex's generated tsconfig pins `lib: ["ES2021"]`; `Array.prototype.at` is ES2022. |
| `apps/native/src/app/**` | `unicorn/filename-case` | An expo-router dynamic segment is named for the param it binds: `[subcategoryId].tsx` is `params.subcategoryId`. |
| `apps/native/src/widgets/**` | `unicorn/consistent-function-scoping` | A widget body is stringified and evaluated in the extension's bare `JSContext`, so a hoisted helper paints a `ReferenceError` on the tile. `outlayr/widget-module-scope` enforces the inverse rule. |
| `domain/uuid5.ts`, `domain/confetti.ts` | `no-bitwise` | RFC 4122 defines the version and variant bits in bitwise terms. |
| `data/budgets.ts` | `oxc/no-barrel-file` | The data layer's public surface. Every consumer imports from `@/data/budgets`, not from the core; splitting it is its own change. |
| `apps/native/src/**` | `no-restricted-imports` | Keeps `useLiveQuery` and `expo-haptics` behind their wrappers; `data/live-query.ts` and `lib/use-haptics.ts` are the two modules that may import them. Also bans the two `@hugeicons-pro/core-*-rounded` barrels: Metro does not tree-shake, and the barrels were 19MB of a 29MB bundle. Import an icon by path, `@hugeicons-pro/core-stroke-rounded/Cancel01Icon`. |
| `components/import-sheet/**` | `no-restricted-imports` (`expo-router`), `outlayr/no-sheet-repaint` | The import flow is one `BottomSheetModal`, never a route: steps navigate through the draft store and only `import-sheet.tsx` may import the router. Step content sits on the root's `backgroundStyle` paper, so no `bg-background`, wash or card class under the directory. |
| `db/transaction.ts` | `outlayr/no-drizzle-transaction` | Where `withTransaction` is implemented, so it necessarily calls the API the rule bans. |
| `lib/convex.ts`, `data/sync-engine-core.ts` | `anti-slop/no-chained-type-assertions` | Two assertion chains against a type we do not own: React Native's `BodyInit` omits the typed array its `fetch` actually sends, and drizzle's builders are generic per table so `Database` shares no members with the single-code-path writer the sync engine calls. |
| `convex/providerLifecycle.ts` | `anti-slop/no-unknown-returns` | `AppleLifecycleContext` is a structural view of better-auth's endpoint context. Its members are better-auth's to declare: tightening `updateAccount` to the `void` the callers use removes the overlap the assertion needs. |

`complexity` is set to **35**. oxlint counts *cyclomatic* complexity where Biome counted *cognitive*, so the old threshold of 25 does not carry across. On the new metric the barely-over cluster sits at 26–33; only `TransactionForm` is genuinely out of hand; its three suppressions are the only ones in the tree and each names that as known debt.

`typescript/consistent-type-imports` sets `disallowTypeAnnotations: false`: `import()` type annotations are the idiom for `jest.mock<typeof import("…")>` factories and ambient asset declarations, and the `import type` preference itself stays on.

`globals` declares `__DEV__` at the top level and `jest` in the `apps/native/jest/**` override, for the setup stubs that cannot import it. Neither runner preset ships globals, and that alone was 275 findings.

## anti-slop

`ultracite/oxlint/anti-slop` rejects low-evidence typing: casts with no stated reason, `unknown` and `object` crossing a signature, values that reach a domain unparsed. Its preset sets all fifteen rules to `error`, and **the `lint` block restates none of them** — the tree satisfies every one as shipped. Only three carve-outs remain, all scoped to files (see the table above).

The preset goes **last** in `extends`, because it also turns off the two core rules that fight it: `typescript/consistent-indexed-object-style` autofixes an index-signature interface into a `Record` alias that `no-known-value-widening` then re-flags, and `unicorn/no-immediate-mutation` bans that rule's own empty-accumulator escape.

The tests scope drops eight of them — `no-chained-type-assertions`, `no-known-value-widening`, `no-module-mocking`, `no-runtime-typeof`, `no-unknown-parameters`, `no-unknown-returns`, `no-unsafe-dictionary-type`, `require-safety-comment-for-type-assertion`. A test declares its own doubles, so the cast, the widened literal and the `unknown` argument **are** the fixture; and `jest.mock` is how jest-expo isolates a native module at all.

Three patterns the rules pushed the source into, worth knowing before writing new code:

- **`no-runtime-typeof` bans every `typeof`, without exception.** Where the union is already declared, branch on the declared member (`closing !== undefined`, `weight === "bold"`); where a value arrives off the wire, parse it — `sync-engine-core` and `domain/archive` both use a module-scope `z.number()` / `z.string()` and read `.success`. Where a function returned `Value | ErrorString`, it now returns a discriminated result instead (`readImportRow` in `data/transfer-core.ts`).
- **`no-known-value-widening` fires on an object literal flowing into an open dictionary or an anonymous object type.** Build the dictionary with `Object.fromEntries` rather than mutating an empty accumulator, and give an inline object annotation a name (`SuggestedCategoryPresets`).
- **`no-shape-in-symbol-names` bans the substring "shape" in any identifier, imported ones included.** SwiftUI's `contentShape` / `shapes` / `buttonBorderShape` are re-exported once from `lib/swift-ui-geometry.ts` as `hitArea` / `outline` / `buttonBorderOutline` — that file carries the only file-level disable in the tree, the same wrapper pattern `no-restricted-imports` already enforces for `useLiveQuery` and `expo-haptics`. Two third-party **option keys** literally named `shape` (uniwind's radial gradient, `@expo/ui`'s `strokeBorder`) carry a one-line suppression each.

## How the test scope was measured

Every test-file carve-out was deleted and the resulting **3,130 errors** worked
through before any rule went back off. What the exercise produced:

- **`@jest/globals` is a real dependency.** Every suite imports its runner
  globals, so the `jest` global is declared only for the setup stubs that cannot
  import it. That typing is not free: `@jest/globals` gives `jest.fn()` the type
  `Mock<UnknownFunction>` where the ambient `jest` gave back `any`, so every spy
  now names the export it stands in for or takes its implementation inline.
- **A real defect.** `apple-sign-in.test.ts` stubbed `CryptoDigestAlgorithm`
  itself and asserted the hash algorithm was `"SHA256"`. The enum's value is
  `"SHA-256"` — the assertion could only ever agree with a constant the test
  invented. It spreads the actual module now.
- **Five shared fixtures**, each replacing duplication a carve-out had been
  hiding: `@/db/test-database` (49 suites declared the same drizzle driver
  bridge), `@/theme/test-colors` (26 hand-picked palettes), `@/i18n/test-locale`,
  `@/contexts/test-local-data`, `@/contexts/test-settings`.
- **The shared stubs moved to `setupFiles`.** `@/i18n/context` and `expo-sqlite`'s change
  listener were environment jest-expo does not supply, retyped verbatim across
  60 files. `@/theme/use-colors` and `@/contexts/local-data-context` stayed
  per-file: their mocked values are each suite's input, not shared setup.
- **Two suites deleted.** `device-data-stores.test.ts` built its own adapters
  inside the test body and never called the module, then compared a constant to a
  copy of itself. `sync.test.tsx` wrapped 17 mocks around two pure decisions,
  which moved to `domain/sync-status.ts` and gained five branches on the way.

The rules that went back off fall into three groups, all in the one node-side
block in `vite.config.ts`:

1. **Evidence rules (248).** A test declares its own doubles, so the cast and the
   widened literal *are* the fixture. `no-module-mocking` is here because
   jest-expo has no other isolation mechanism.
2. **Shape rules (335).** `max-expects`, `require-top-level-describe`,
   `prefer-ending-with-an-expect` and friends describe someone else's layout. The
   worst `max-expects` file is `erase-core`, where ten well-named tests check a
   tombstone is scrubbed column by column — one behaviour, many fields.
3. **`no-untyped-mock-factory` (152 type errors).** It reads `typeof import("m")`
   as the whole module, so a factory standing in for two exports out of nine
   cannot satisfy it. `Partial<>` reaches the top level and no further: below
   that a `useRouter` stub owes a whole `Router`. Vitest spells the same rule
   `require-mock-type-parameters`.

The rest of that block is style in code read top to bottom: stub classes with
no `this` (`class-methods-use-this`, `max-classes-per-file`), fixture rows
applied in order (`no-await-in-loop`), and RFC 4122 and confetti suites checking
bits (`no-bitwise`). `import/first` is off because the hoisting below puts spies
above the imports on purpose (22 reports). `react/globals` and
`react/immutability` reported 9 render probes whose body is the assertion
(counting renders, capturing a hook's return); the compiler never bundles a
suite, and both stay on in `src/`.

Two traps worth knowing before editing a mock factory, both from
`babel-plugin-jest-hoist` lifting `jest.mock` above the imports:

- A factory may only reach a **`mock`-prefixed** binding, and a shared fixture it
  calls must have **no runtime imports of its own** — the factory can run before
  those imports evaluate, and if a suite mocks that module the fixture silently
  resolves to the mock. `test-settings.ts` restates its defaults as literals for
  exactly this reason.
- `(...args) => mockFn(...args)` is **deferral, not ceremony**. Passing the spy
  directly binds it at factory time, before the module-scope `const` runs, so the
  export lands as `undefined` and the suite fails with "Number of calls: 0".
  Type the wrapper `(...args: Parameters<typeof mockFn>)`.

## Warnings, not errors

The React Compiler rules (`REACT_COMPILER_RULES` in `vite.config.ts`) and `react/exhaustive-deps` are set to `warn` rather than `error`. Biome never ran the compiler rules, so every finding they reported was pre-existing and they were left as a backlog rather than a gate. That backlog was worked off, and the `warn` severity is what keeps a new one visible without failing the build.

oxlint 1.79 split the single `react/react-compiler` rule into 22 per-category rules. Two of them, `exhaustive-effect-dependencies` (5) and `memo-dependencies` (1), report extra dependencies the old rule never did; those 6 are the current warnings. Each removal changes when an effect or memo recomputes, so they are a reviewed backlog, not an autofix. `react/todo` is off: it reports syntax the compiler cannot lower yet. No source file disables a `react/*` rule: code the compiler would skip is restructured instead, and `react/rule-suppression` reports any disable that comes back.

## Why jest and vitest are re-anchored

Both presets claim `**/*.{test,spec}.*`, so extending both reports every assertion twice. `apps/native` runs jest-expo and the packages run vitest, so `scopeTo()` re-prefixes each preset's own overrides to the tree that uses that runner. The per-runner opt-outs have to be merged into those blocks rather than added as a later override — a rule from a plugin is only resolvable in a block that enables the plugin.

## outlayr

`packages/config/oxlint/plugin.mjs` is the repo's own plugin, registered as `outlayr/*`. Each rule replaced a jest suite that read source files as text and asserted with a regex (`grounds.test.ts`, `transaction-guard.test.ts`, `widget-scope.test.ts`, `no-background.test.ts`, the `EditorCta` call-site scan). On the AST the same invariant reports at the offending line, ignores comments, and fires in the editor instead of after a full jest run. The rules are on for `apps/native/src/**` only and off in tests, where a `<List>` fixture or a `db.transaction` double is not a shipped screen.

| Rule | Invariant |
|---|---|
| `no-drizzle-transaction` | Never `db.transaction()`: `drizzle-orm/expo-sqlite` commits before an async callback runs. Use `withTransaction`. |
| `swiftui-list-grounds` | A file rendering `<List>` or `<Form>` calls both `groupedList()` and `groupedRows()`, or the screen ships on iOS's grey. |
| `bottom-sheet-background` | A file that value-imports `BottomSheetModal` passes it a `backgroundStyle`. |
| `no-sheet-repaint` | Scoped to `components/import-sheet/**`: no `bg-background`, `bg-surface`, `bg-card` or `bg-foreground/N` in any string. |
| `widget-module-scope` | A file with a `"widget"` directive declares nothing else at module scope; the body is evaluated in a bare `JSContext`. |
| `editor-cta-busy` | Every `<EditorCta>` passes `busy`, so a save spins rather than only dimming. |
| `no-slop-comments` | On for every file. A comment block (consecutive `//` lines count as one) has at most three lines, no line past column 120 unless it holds a URL, and no em dash. Lint and TypeScript directives are exempt from the length limits. Longer reasoning goes in the commit message or here. |
| `no-low-value-comments` | On for every file. Rejects a comment that only repeats the name below it, a section divider, a test step label (`// arrange`), a `TODO`/`FIXME` with no issue link, a JSDoc type in TypeScript, an empty `@param`/`@returns`, and commented-out code. Ported from t3code, MIT: the rule and its `LICENSE` live in `packages/config/oxlint/t3code/`. |
| `no-test-timeout-or-retry` | On in test files instead, both runners: no timeout argument on a test or hook, no `{ timeout }` or `{ retry }` options, no `jest.setTimeout`, `jest.retryTimes` or `vi.setConfig` override. A test that needs more time is waiting on something it should await. `*.live.test.ts` model probes are exempt. |

The reason for each lives in the plugin, as a comment above the rule or in its message. To prove a rule still fires, break the invariant in a shipped file and run `vp check`; every rule was verified that way when it landed.

## Tailwind

`oxlint-tailwindcss` reads `apps/native/global.css` and lints class strings against the real Uniwind theme. `apps/screenshots` is ignored by both lint and format: it is scaffolded rather than authored here, and it is Tailwind v3 against that v4 entry point, so every class would report unknown. Its hand-written `scripts/` stay checked. Only its correctness rules are on. `enforce-sort-order` and the rest of its style set are off: oxfmt already owns class order inside `cn`/`tv`/`clsx`, and the plugin's sorter would additionally reorder 302 raw `className` strings.

One class the theme does not define is allowed, `ph-no-capture`: PostHog's opt-out, which keeps the web calculators out of autocapture, dead clicks and session replay. `data-ph-no-autocapture` only covers autocapture. It does nothing in `apps/native`, where posthog-react-native ignores `className`. The allowlist sits on the root rule because oxlint drops a JS plugin rule's options in an override.

It earned its place on the first run by finding six classes that are not in the theme and so rendered as nothing: `text-tv`, `tracking-micro` (×2) and `text-subheadline` (×3). They now use the nearest token the theme actually defines — `text-hero`, `tracking-eyebrow` and `text-subtitle`.

## Suppressing at a call site

```ts
// oxlint-disable-next-line no-await-in-loop -- rows apply in seq order — the server hands out one per accepted row, and a second row with the same localId needs the first upsert to be observable
```

The reason after `--` names the actual constraint. `intentional`, `needed here`, `false positive` and `by design` are not reasons. Several rules can share one directive: `// oxlint-disable-next-line no-bitwise, unicorn/prefer-code-point -- …`. Stacking two `disable-next-line` comments does **not** work — the first one then points at the second comment rather than at the code.

For a whole loop, wrap it instead of annotating every `await` in the body:

```ts
/* oxlint-disable no-await-in-loop -- each page's cursor is the next request's argument */
for (;;) { … }
/* oxlint-enable no-await-in-loop */
```

`oxlint-enable` is not scoped to the block it closes, so a nested pair re-enables the rule for the rest of the outer loop. Use one block at the outermost loop that needs it.

Note that `oxlint-disable-next-line` applies to the **next line**, and to the line the diagnostic is reported on — which for rules like `promise/no-callback-in-promise` is the inner call, not the `.then(`.
