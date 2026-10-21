import { fileURLToPath } from "node:url";

import ultraciteFmt from "ultracite/oxfmt";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import jest from "ultracite/oxlint/jest";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";
import { defineConfig } from "vite-plus";
import type { OxlintOverride } from "vite-plus/lint";

// Paths ultracite's shared ignore list does not know about. Reasoning for the
// non-obvious ones: `drizzle` and `uniwind-types.d.ts` are generated, `ios` /
// `android` / `Pods` are CNG output, `.agents` / `.claude` are vendored skill
// trees we do not own, and `apps/screenshots` is the App Store marketing deck —
// pnpm installs it now, but it is scaffolded rather than authored here, and it
// is Tailwind v3 while `settings.tailwindcss.entryPoint` below points at the
// native app's v4 `global.css`, so linting it would report every class unknown.
// Its hand-written `scripts/` write simulator ledgers and stay checked.
const projectIgnores = [
    ".impeccable",
    "apps/screenshots/*",
    "!apps/screenshots/scripts",
    "**/.expo",
    "**/.vscode",
    "**/drizzle",
    "**/uniwind-types.d.ts",
    "**/ios",
    "**/android",
    "**/Pods",
    "**/*.icon",
    "**/.agents",
    "**/.playwright-mcp",
    "**/.claude",
    "skills-lock.json",
];

// `*.md` and `*.html` are formats oxfmt handles and oxlint does not, so they
// only need excluding on the format side. The HTML left is generator pages
// reviewed as rendered output, and `proseWrap: "never"` would rejoin every
// wrapped paragraph in docs/ — both are
// churn, not migration. Drop these two entries to opt in.
const formatOnlyIgnores = ["**/*.html", "**/*.md"];

const NATIVE_SOURCE = "apps/native/src/**";
// Code that runs on node rather than in the app: the suites, the fixtures they
// share, the jest setup stubs, and the build scripts.
const NODE_SIDE_FILES = [
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "**/test-*.ts",
    "**/test.helpers.ts",
    "apps/native/jest/**",
    "**/scripts/**",
];

// Imports every file under apps/native/src answers for. Each override that
// touches `no-restricted-imports` restates this list, because an override
// replaces the rule's options rather than merging them; the two wrapper
// modules drop only the entry they exist to wrap.
const LIVE_QUERY_IMPORT = {
    importNames: ["useLiveQuery"],
    message:
        "Drizzle's useLiveQuery renders one empty frame before its query answers. Import useLiveQuery from @/data/live-query, which reads in render.",
    name: "drizzle-orm/expo-sqlite",
};
const HAPTICS_IMPORT = {
    message: "A direct call fires whatever the Haptics setting says. Use useHaptics from @/lib/use-haptics.",
    name: "expo-haptics",
};
const ICON_BARREL_IMPORTS = ["solid", "stroke"].map((weight) => ({
    message: `The pack barrel is 6-12MB and Metro ships all of it. Import the icon by path: @hugeicons-pro/core-${weight}-rounded/<Name>Icon.`,
    name: `@hugeicons-pro/core-${weight}-rounded`,
}));
const NATIVE_RESTRICTED_IMPORTS = [LIVE_QUERY_IMPORT, HAPTICS_IMPORT, ...ICON_BARREL_IMPORTS];

// Rules that describe the shape of someone else's test rather than whether it
// holds. `max-expects` reported 128 times and its worst file is `erase-core`,
// where ten well-named tests check that a tombstone is scrubbed column by
// column — one behaviour, many fields, which is the assertion and not a smell.
// `require-top-level-describe` and `prefer-ending-with-an-expect` are the same
// kind of claim about layout. The rest are the same category: a `try`/`catch`
// that asserts on the caught error, a table written as separate `it`s because
// the cases differ in more than their data, a helper that carries the `expect`,
// and `toThrow()` where the type of the error is the claim. Both runners name
// all six identically.
const RUNNER_OPT_OUT = [
    "expect-expect",
    "max-expects",
    "no-conditional-expect",
    "prefer-each",
    "require-to-throw-message",
    "require-top-level-describe",
];
// `no-untyped-mock-factory` reads `typeof import("m")` as the whole module, so a
// factory that stands in for two exports out of nine cannot satisfy it —
// `Partial<>` only reaches the top level, and below that every mocked hook owes
// a complete third-party return value (a `useRouter` stub owes a whole `Router`).
// The 152 type errors it produced across 47 files were all that shape. The
// factories keep the type parameter wherever it does hold.
const JEST_ONLY_OPT_OUT = ["no-untyped-mock-factory", "prefer-ending-with-an-expect"];
// `prefer-describe-function-title` substitutes the referenced binding for the
// string title, so `describe("crons", …)` becomes `describe(crons, …)` — a type
// error for every subject that is a value rather than a function, and a silent
// suite rename for the rest. It rewrote four titles in `packages/backend` on the
// run that re-enabled it. `require-mock-type-parameters` is vitest's spelling of
// `no-untyped-mock-factory` and is off for the same reason as its jest twin.
const VITEST_ONLY_OPT_OUT = ["prefer-describe-function-title", "require-mock-type-parameters"];
// oxlint 1.79 split `react/react-compiler` into these. Like the rule they
// replace, they stay `warn`: a new finding is visible without failing the build.
const REACT_COMPILER_RULES = [
    "capitalized-calls",
    "error-boundaries",
    "exhaustive-effect-dependencies",
    "globals",
    "hooks",
    "immutability",
    "incompatible-library",
    "invariant",
    "memo-dependencies",
    "no-deriving-state-in-effects",
    "preserve-manual-memoization",
    "purity",
    "refs",
    "rule-suppression",
    "set-state-in-effect",
    "set-state-in-render",
    "static-components",
    "syntax",
    "unsupported-syntax",
    "use-memo",
    "void-use-memo",
];

// The jest and vitest presets both claim `**/*.{test,spec}.*`, so extending both
// reports every assertion twice. This repo splits cleanly — apps/native runs
// jest-expo and the packages run vitest — so each preset's overrides get
// re-anchored to the tree that actually uses that runner. The opt-outs have to
// be merged in here rather than added as a later override: a rule from a plugin
// is only resolvable in a block that enables the plugin.
const scopeTo = (prefix: string, plugin: string, extraOptOut: string[], preset: { overrides?: OxlintOverride[] }) =>
    (preset.overrides ?? []).map((override) => ({
        ...override,
        files: override.files.map((glob) => `${prefix}/${glob}`),
        rules: {
            ...override.rules,
            ...Object.fromEntries([...RUNNER_OPT_OUT, ...extraOptOut].map((rule) => [`${plugin}/${rule}`, "off"])),
        },
    }));

export default defineConfig({
    fmt: {
        ...ultraciteFmt,
        ignorePatterns: [...ultraciteFmt.ignorePatterns, ...formatOnlyIgnores, ...projectIgnores],
        printWidth: 120,
        tabWidth: 4,
    },
    lint: {
        // anti-slop goes last: its preset also turns off the two core rules that
        // fight it (`typescript/consistent-indexed-object-style` autofixes into a
        // `Record` alias that `no-known-value-widening` then re-flags, and
        // `unicorn/no-immediate-mutation` bans that rule's own empty-accumulator
        // escape), and a later config wins.
        extends: [core, react, tanstack, antiSlop],
        // Every test now imports its runner globals, so only React Native's
        // build-time flag is left to declare here. The three setup stubs under
        // apps/native/jest still run against the injected `jest` object; they
        // get it from their own override below.
        globals: {
            __DEV__: "readonly",
        },
        ignorePatterns: [...core.ignorePatterns, ...projectIgnores],
        // anti-slop registers its own plugin entry through the preset above.
        // `outlayr` holds the design rules that used to be jest suites reading
        // source as text; see packages/config/oxlint/plugin.mjs.
        jsPlugins: [
            "oxlint-tailwindcss",
            {
                name: "outlayr",
                specifier: fileURLToPath(new URL("packages/config/oxlint/plugin.mjs", import.meta.url)),
            },
        ],
        overrides: [
            ...scopeTo("apps/native", "jest", JEST_ONLY_OPT_OUT, jest),
            ...scopeTo("packages", "vitest", VITEST_ONLY_OPT_OUT, vitest),
            {
                // Setup files, not tests: jest loads them through `setupFiles` /
                // `moduleNameMapper` before any module graph exists, so they
                // cannot import `@jest/globals` the way the suites do.
                files: ["apps/native/jest/**"],
                globals: {
                    jest: "readonly",
                },
            },
            {
                // The two anti-slop rules whose findings a test cannot answer in
                // its own words. Both were measured at full strength first, over
                // the whole suite, rather than assumed:
                //
                // `no-module-mocking` reported 236 times. jest-expo has no other
                // way to isolate a native module, so every one of those is a
                // suppression, not a fix — the rule would live in the files
                // instead of here, which is the same exception with more noise.
                //
                // `require-safety-comment-for-type-assertion` reported 464 times,
                // and the honest reason is the same sentence at nearly all of
                // them — the fixture is the assertion. The casts that had a real
                // reason were worth extracting and no longer exist: 49 suites
                // each declared the same drizzle driver bridge, now one commented
                // assertion in `@/db/test-database`.
                //
                // Both stay on in `src/`, where an unexplained cast is evidence
                // of something.
                // The counts below are what each rule reported over the whole
                // tree with every carve-out removed.
                files: NODE_SIDE_FILES,
                rules: {
                    // anti-slop's evidence rules, 248 between them. A test
                    // declares its own doubles, so there is nothing here for them
                    // to protect — the cast, the widened literal and the
                    // `unknown` argument are the fixture, and `no-unknown-returns`
                    // lands on the structural double a suite builds for a
                    // boundary it does not own (better-auth's client, a Convex
                    // handler ctx). Where a cast did have a reason worth stating
                    // it was worth extracting instead, and has been: the drizzle
                    // driver bridge 49 suites each declared is now one commented
                    // assertion in `@/db/test-database`. `no-module-mocking` is
                    // here because jest-expo has no other way to isolate a native
                    // module; the mocks that were shared setup rather than a
                    // decision have moved to `setupFiles`.
                    "anti-slop/no-chained-type-assertions": "off",
                    "anti-slop/no-known-value-widening": "off",
                    "anti-slop/no-module-mocking": "off",
                    "anti-slop/no-runtime-typeof": "off",
                    "anti-slop/no-unknown-parameters": "off",
                    "anti-slop/no-unknown-returns": "off",
                    "anti-slop/no-unsafe-dictionary-type": "off",
                    "anti-slop/require-safety-comment-for-type-assertion": "off",
                    // The stub classes a factory returns to satisfy a shape: one
                    // static-ish member, several per file, no `this` in a method.
                    "eslint/class-methods-use-this": "off",
                    "eslint/max-classes-per-file": "off",
                    // Style in code that is read top to bottom and never tuned:
                    // a loop that applies fixture rows in order, `(await
                    // seed(db)).id`, a helper scoped to the suite that uses it,
                    // and an expectation annotated on its own line. `no-bitwise`
                    // joins them because RFC 4122 and the confetti seed are
                    // defined in bitwise terms and their suites check the bits.
                    "eslint/no-await-in-loop": "off",
                    "eslint/no-bitwise": "off",
                    "eslint/no-empty-function": "off",
                    "eslint/no-implicit-globals": "off",
                    "eslint/no-inline-comments": "off",
                    // Not style: babel-plugin-jest-hoist lifts every `jest.mock`
                    // above the imports, so a suite that reads a spy inside a
                    // factory has to declare it above them too. `import/first`
                    // reports the resulting order 22 times and the fix would break
                    // the hoisting it is complaining about.
                    "import/first": "off",
                    "import/no-named-as-default-member": "off",
                    // The compiler never sees these files: it runs as a Babel pass
                    // over the app bundle, and a suite is not bundled. All 9 reports
                    // were one shape — a probe whose render body *is* the assertion.
                    // Counting renders to prove a context does not wake an unrelated
                    // subscriber, or capturing a hook's return so the test can read
                    // it, means writing to something outside the component during
                    // render, which is what the rules exist to find in shipped code.
                    // They stay on everywhere else in `src/`.
                    "react/globals": "off",
                    "react/immutability": "off",
                    "react/state-in-constructor": "off",
                    "typescript/class-literal-property-style": "off",
                    "typescript/no-explicit-any": "off",
                    "unicorn/consistent-function-scoping": "off",
                    "unicorn/import-style": "off",
                    "unicorn/no-await-expression-member": "off",
                    "unicorn/no-object-as-default-parameter": "off",
                },
            },
            {
                files: ["packages/backend/convex/**"],
                rules: {
                    // In Convex the filename *is* the API path:
                    // `convex/exchangeRates.ts` is `api.exchangeRates.get`.
                    // Kebab-casing would rewrite every client call site.
                    "unicorn/filename-case": ["error", { case: "camelCase" }],
                    // Convex's generated tsconfig pins `lib: ["ES2021"]`;
                    // `Array.prototype.at` is ES2022.
                    "unicorn/prefer-at": "off",
                },
            },
            {
                // An expo-router dynamic segment is named for the param it binds, so
                // `[subcategoryId].tsx` is `params.subcategoryId`. Kebab-casing the
                // file renames the route param.
                files: ["apps/native/src/app/**"],
                rules: {
                    "unicorn/filename-case": "off",
                },
            },
            {
                // A widget body is stringified and evaluated in the extension's own
                // bare JSContext, so a helper hoisted to module scope resolves to
                // nothing and paints a ReferenceError on the tile.
                // `outlayr/widget-module-scope` enforces the inverse rule:
                // nothing at module scope but the component itself.
                files: ["apps/native/src/widgets/**"],
                rules: {
                    "unicorn/consistent-function-scoping": "off",
                },
            },
            {
                // RFC 4122 defines the version and variant bits in bitwise terms.
                files: ["apps/native/src/domain/uuid5.ts", "apps/native/src/domain/confetti.ts"],
                rules: {
                    "no-bitwise": "off",
                },
            },
            {
                // The data layer's public surface. Splitting it is its own change:
                // every consumer imports from `@/data/budgets`, not from the core.
                files: ["apps/native/src/data/budgets.ts"],
                rules: {
                    "oxc/no-barrel-file": "off",
                },
            },
            {
                files: [NATIVE_SOURCE],
                rules: {
                    "no-restricted-imports": ["error", { paths: NATIVE_RESTRICTED_IMPORTS }],
                    // The repo's own design rules, each with its reason in the
                    // plugin. Native only: they read SwiftUI hosts, widget bodies
                    // and drizzle-orm/expo-sqlite, none of which the packages have.
                    "outlayr/bottom-sheet-background": "error",
                    "outlayr/editor-cta-busy": "error",
                    "outlayr/no-drizzle-transaction": "error",
                    "outlayr/swiftui-list-grounds": "error",
                    "outlayr/widget-module-scope": "error",
                },
            },
            {
                // The module the useLiveQuery restriction points at; every other ban holds.
                files: ["apps/native/src/data/live-query.ts"],
                rules: {
                    "no-restricted-imports": ["error", { paths: [HAPTICS_IMPORT, ...ICON_BARREL_IMPORTS] }],
                },
            },
            {
                // Likewise for the haptics wrapper.
                files: ["apps/native/src/lib/use-haptics.ts", "apps/native/src/lib/use-haptics.android.ts"],
                rules: {
                    "no-restricted-imports": ["error", { paths: [LIVE_QUERY_IMPORT, ...ICON_BARREL_IMPORTS] }],
                },
            },
            {
                // The import flow is one BottomSheetModal presented over the Log,
                // never an expo-router route: steps navigate through the draft
                // store, and only the sheet root (carved out below) touches the
                // router. Content under it sits on the root's `backgroundStyle`
                // paper, so no step paints its own ground. An override replaces
                // the rule's options rather than merging them, so the native
                // paths are restated here and in the carve-out.
                files: ["apps/native/src/components/import-sheet/**"],
                rules: {
                    "no-restricted-imports": [
                        "error",
                        {
                            paths: [
                                ...NATIVE_RESTRICTED_IMPORTS,
                                {
                                    message:
                                        "Import steps navigate through the draft store; only import-sheet.tsx touches expo-router.",
                                    name: "expo-router",
                                },
                            ],
                        },
                    ],
                    "outlayr/no-sheet-repaint": "error",
                },
            },
            {
                files: ["apps/native/src/components/import-sheet/import-sheet.tsx"],
                rules: {
                    "no-restricted-imports": ["error", { paths: NATIVE_RESTRICTED_IMPORTS }],
                },
            },
            {
                // Where the ban is implemented, so it necessarily calls the API it bans.
                files: ["apps/native/src/db/transaction.ts"],
                rules: {
                    "outlayr/no-drizzle-transaction": "off",
                },
            },
            {
                // The design rules read shipped screens; a suite rendering a
                // `<List>` fixture, a `db.transaction` double or a `bg-card`
                // expectation is not one. Same file set as the node-side block
                // above, and after the import-sheet override so it wins there.
                files: NODE_SIDE_FILES,
                rules: {
                    "outlayr/bottom-sheet-background": "off",
                    "outlayr/editor-cta-busy": "off",
                    "outlayr/no-drizzle-transaction": "off",
                    "outlayr/no-sheet-repaint": "off",
                    "outlayr/swiftui-list-grounds": "off",
                    "outlayr/widget-module-scope": "off",
                },
            },
            {
                files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
                rules: {
                    "outlayr/no-test-timeout-or-retry": "error",
                },
            },
            {
                files: ["**/*.live.test.ts"],
                rules: {
                    "outlayr/no-test-timeout-or-retry": "off",
                },
            },
            {
                // The two assertion chains this codebase cannot retire, both against
                // a type we do not own. React Native's `BodyInit` omits the typed
                // array its `fetch` actually sends, and drizzle's builders are
                // generic per table so `Database` shares no members with the
                // single-code-path writer the sync engine calls. Each is one named,
                // commented hop — `anyWriter` in the second case.
                files: ["apps/native/src/lib/convex.ts", "apps/native/src/data/sync-engine-core.ts"],
                rules: {
                    "anti-slop/no-chained-type-assertions": "off",
                },
            },
            {
                // `AppleLifecycleContext` is a structural view of better-auth's
                // endpoint context, narrowed by assertion. Its members are
                // better-auth's to declare: tightening `updateAccount` to the `void`
                // the callers use removes the overlap the assertion needs.
                files: ["packages/backend/convex/providerLifecycle.ts"],
                rules: {
                    "anti-slop/no-unknown-returns": "off",
                },
            },
        ],
        rules: {
            // anti-slop (shipped by ultracite, extended above) rejects low-evidence
            // typing: casts with no stated reason, `unknown`/`object` inputs, and
            // values that cross a boundary unparsed. Its preset sets every rule to
            // `error` and nothing here restates a severity — the tree satisfies all
            // fifteen as shipped. The only carve-outs left are scoped to files:
            // the test block above (where the cast and the widened literal ARE the
            // fixture), and the three source files named in their own overrides.
            //
            // oxlint counts cyclomatic complexity where Biome counted cognitive, so
            // the old threshold of 25 does not carry across. On the new metric the
            // cluster that is barely over sits at 26-33 and only the transaction
            // form is genuinely out of hand, so 35 keeps drawing the same line.
            complexity: ["error", { max: 35 }],
            // `x == null` is the nullish check, not a lazy `===`: `undefined ==
            // null` is true, `undefined === null` is false. 63 files use the
            // `!= null` counterpart. Both rules have to relax — `eqeqeq` alone
            // still leaves `no-eq-null` flagging all 462 sites.
            eqeqeq: ["error", "always", { null: "ignore" }],
            // Components and helpers are declared with `function` throughout, and
            // the tree relies on hoisting (`RootNavigator` references `RouteGate`
            // above its definition). Converting 2000+ declarations to arrow
            // expressions is an idiom change, not a toolchain migration.
            "func-style": "off",
            "no-eq-null": "off",
            // Hoisting is load-bearing here for the same reason.
            "no-use-before-define": ["error", { classes: false, functions: false, variables: false }],
            // Metro resolves `require()` for static assets and for the lazy native
            // modules that must not load at import time. This rule and
            // `unicorn/prefer-module` both assume an ESM graph this app lacks.
            "node/global-require": "off",
            "one-var": ["error", "never"],
            "outlayr/no-low-value-comments": "error",
            "outlayr/no-slop-comments": "error",
            // Adding the `u` flag switches escape handling and `\w` semantics for
            // every regex in the CSV, currency and i18n parsers at once; named
            // capture groups rewrite the same expressions. Neither is verifiable in
            // a toolchain migration.
            "prefer-named-capture-group": "off",
            // The four sites are the promise primitives themselves — a timer bridge
            // for `yieldToUi`, and a hold that never settles so a committed CTA
            // cannot re-enable. There is no existing promise to await instead.
            "promise/avoid-new": "off",
            // 90 promise chains and 44 callback APIs predate this gate. Left as a
            // follow-up so the migration is not also a rewrite.
            "promise/prefer-await-to-callbacks": "off",
            "promise/prefer-await-to-then": "off",
            ...Object.fromEntries(REACT_COMPILER_RULES.map((rule) => [`react/${rule}`, "warn"])),
            "react/exhaustive-deps": "warn",
            "react/function-component-definition": "off",
            // Two deliberate shapes, 15 sites: `const [seed] = useState(() => …)`
            // takes a render-stable snapshot and wants no setter, and
            // `const [x, setXState] = useState(…)` names the raw setter apart
            // because the exported `setX` does more than assign.
            "react/hook-use-state": "off",
            // Three DOM assumptions that do not survive React Native. `style` here
            // is a Skia `Path` mode (`style="stroke"`), not a CSS object; RN passes
            // handlers named for what they do (`onPress={openSheet}`) rather than
            // `handleX`; `.reduce` is how the aggregates in domain/ are written.
            "react/jsx-handler-names": "off",
            "react/style-prop-object": "off",
            // Syntax the compiler cannot lower yet (`try`/`finally`, `??=`): it skips
            // the component, and the code is correct as written.
            "react/todo": "off",
            // Every site is a callback satisfying a Promise-returning contract
            // (`photos: async () => clearStoredPhotos()`, a Convex `handler`).
            // Dropping `async` turns a synchronous throw into a thrown error where
            // the caller is written to handle a rejection.
            "require-await": "off",
            "require-unicode-regexp": "off",
            // Correctness only. `enforce-sort-order` and the plugin's other style
            // rules stay off: oxfmt already owns class order inside `cn`/`tv`/`clsx`,
            // and the plugin's sorter would additionally reorder 302 raw `className`
            // strings that nothing else touches.
            "tailwindcss/no-conflicting-classes": "error",
            "tailwindcss/no-contradicting-variants": "error",
            "tailwindcss/no-deprecated-classes": "error",
            "tailwindcss/no-duplicate-classes": "error",
            "tailwindcss/no-unknown-classes": "error",
            "tailwindcss/no-unnecessary-whitespace": "error",
            // `import()` type annotations are the correct idiom for
            // `jest.mock<typeof import("…")>` factories and ambient asset
            // declarations; the `import type` preference itself stays on.
            "typescript/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
            // Renames the caught binding to `error` *and* rewrites the shorthand
            // property built from it — `catch (cause) { failure = { cause } }`
            // became `{ error }`, silently changing the object's shape.
            "unicorn/catch-error-name": "off",
            "unicorn/no-array-reduce": "off",
            // `.sort()` / `.reverse()` in place is deliberate on arrays this code
            // just built, and the call sites already spread first where the input is
            // shared. `.toSorted()` / `.toReversed()` are a different allocation and
            // a different Hermes baseline than the tests, which run on node, cover.
            "unicorn/no-array-reverse": "off",
            "unicorn/no-array-sort": "off",
            // Its fix drops the argument rather than the value, so it turns
            // `mockResolvedValue(undefined)` into an arity error and guts the tests
            // whose whole subject is what a function does with `undefined`.
            "unicorn/no-useless-undefined": "off",
            "unicorn/prefer-module": "off",
            // `Number()` is not `parseFloat()`: the CSV importer and the numpad both
            // rely on a trailing-garbage cell parsing to its leading number rather
            // than to NaN.
            "unicorn/prefer-number-coercion": "off",
            // Swaps the array literal for `new Set(…)` without touching the
            // `: string[]` annotation or the `.includes` call sites.
            "unicorn/prefer-set-has": "off",
        },
        settings: {
            tailwindcss: {
                entryPoint: [
                    { files: "apps/web/**", use: "apps/web/src/index.css" },
                    { files: "**", use: "apps/native/global.css" },
                ],
            },
        },
    },
    // Runs from .vite-hooks/pre-commit via `vp staged`. `vp check --fix` covers
    // both halves of the gate, and vp re-stages what it rewrites — a lint error
    // reverts the working tree and blocks the commit rather than half-applying.
    staged: {
        "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,css}": "vp check --fix",
    },
});
