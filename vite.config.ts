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

// Why each rule is on, off or scoped, and why apps/screenshots is ignored: docs/internals/linting.md.
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
    "packages/backend/convex/*.ts",
    "!packages/backend/convex/auth.config.ts",
    "!packages/backend/convex/convex.config.ts",
    "!packages/backend/convex/crons.ts",
    "!packages/backend/convex/http.ts",
];

const formatOnlyIgnores = ["**/*.html", "**/*.md"];

const NATIVE_SOURCE = "apps/native/src/**";
const HERMES_SOURCE = [
    NATIVE_SOURCE,
    "packages/backend/confect/lib/syncTables.ts",
    "packages/env/src/**",
    "packages/money/src/**",
];
const MANUAL_MEMO_FILES = [
    "apps/native/src/data/budgets.ts",
    "apps/native/src/data/categories.ts",
    "apps/native/src/data/installment-reads.ts",
    "apps/native/src/data/transactions.ts",
    "apps/native/src/hooks/use-merged-ref.ts",
    "apps/native/src/lib/auth-session.tsx",
    "apps/native/src/lib/ledger-adoption.tsx",
    "apps/native/src/lib/use-day-card-share.ts",
];
const SHIPPED_SOURCE = ["apps/native/src/**", "apps/web/src/**", "packages/*/src/**"];
const TEST_FILES = ["**/*.test.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", "**/*.spec.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"];
const NODE_SIDE_FILES = [
    "**/*.test.{ts,tsx}",
    "**/*.spec.{ts,tsx}",
    "**/test-*.ts",
    "**/test.helpers.ts",
    "apps/native/jest/**",
    "**/scripts/**",
];

// An override replaces `no-restricted-imports` options rather than merging them, so each override restates these.
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
const SECURE_STORE_IMPORT = {
    message:
        "Secure storage is the SecureStorage service. Call it through @/state/secure-storage-commands; only lib/cloud-runtime.ts keeps the synchronous API better-auth's storage adapter needs.",
    name: "expo-secure-store",
};
const ICON_BARREL_IMPORTS = ["solid", "stroke"].map((weight) => ({
    message: `The pack barrel is 6-12MB and Metro ships all of it. Import the icon by path: @hugeicons-pro/core-${weight}-rounded/<Name>Icon.`,
    name: `@hugeicons-pro/core-${weight}-rounded`,
}));
const NATIVE_RESTRICTED_IMPORTS = [LIVE_QUERY_IMPORT, HAPTICS_IMPORT, SECURE_STORE_IMPORT, ...ICON_BARREL_IMPORTS];

const RUNNER_OPT_OUT = [
    "expect-expect",
    "max-expects",
    "no-conditional-expect",
    "prefer-each",
    "require-to-throw-message",
    "require-top-level-describe",
];
const JEST_ONLY_OPT_OUT = ["no-untyped-mock-factory", "prefer-ending-with-an-expect"];
const VITEST_ONLY_OPT_OUT = ["prefer-describe-function-title", "require-mock-type-parameters"];
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

// A plugin's rule only resolves in a block that enables the plugin, so opt-outs merge into the preset's own overrides.
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
        // anti-slop goes last: it turns off two core rules that fight it, and a later config wins.
        extends: [core, react, tanstack, antiSlop],
        globals: {
            __DEV__: "readonly",
        },
        ignorePatterns: [...core.ignorePatterns, ...projectIgnores],
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
                files: ["apps/native/jest/**"],
                globals: {
                    jest: "readonly",
                },
            },
            {
                files: NODE_SIDE_FILES,
                rules: {
                    "anti-slop/no-chained-type-assertions": "off",
                    "anti-slop/no-known-value-widening": "off",
                    "anti-slop/no-module-mocking": "off",
                    "anti-slop/no-runtime-typeof": "off",
                    "anti-slop/no-unknown-parameters": "off",
                    "anti-slop/no-unknown-returns": "off",
                    "anti-slop/no-unsafe-dictionary-type": "off",
                    "anti-slop/require-safety-comment-for-type-assertion": "off",
                    "eslint/class-methods-use-this": "off",
                    "eslint/max-classes-per-file": "off",
                    "eslint/no-await-in-loop": "off",
                    "eslint/no-bitwise": "off",
                    "eslint/no-empty-function": "off",
                    "eslint/no-implicit-globals": "off",
                    "eslint/no-inline-comments": "off",
                    // babel-plugin-jest-hoist lifts `jest.mock` above the imports, so a spy a factory reads is
                    // declared above them too, and this rule's fix would break that.
                    "import/first": "off",
                    "import/no-named-as-default-member": "off",
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
                files: ["packages/backend/convex/**", "packages/backend/confect/**"],
                rules: {
                    "unicorn/filename-case": ["error", { case: "camelCase" }],
                    "unicorn/prefer-at": "off",
                },
            },
            {
                files: ["packages/backend/confect/**/*.spec.ts"],
                plugins: ["vitest"],
                rules: {
                    "vitest/consistent-test-filename": "off",
                },
            },
            {
                files: ["apps/native/src/app/**"],
                rules: {
                    "unicorn/filename-case": "off",
                },
            },
            {
                files: ["apps/native/src/widgets/**"],
                rules: {
                    "unicorn/consistent-function-scoping": "off",
                },
            },
            {
                files: ["apps/native/src/domain/uuid5.ts", "apps/native/src/domain/confetti.ts"],
                rules: {
                    "no-bitwise": "off",
                },
            },
            {
                files: ["apps/native/src/data/budgets.ts"],
                rules: {
                    "oxc/no-barrel-file": "off",
                },
            },
            {
                files: [NATIVE_SOURCE],
                rules: {
                    "no-restricted-imports": ["error", { paths: NATIVE_RESTRICTED_IMPORTS }],
                    "outlayr/bottom-sheet-background": "error",
                    "outlayr/editor-cta-busy": "error",
                    "outlayr/no-drizzle-transaction": "error",
                    "outlayr/no-hookless-use-function": "error",
                    "outlayr/no-manual-memo": "error",
                    "outlayr/swiftui-list-grounds": "error",
                    "outlayr/widget-module-scope": "error",
                },
            },
            {
                files: MANUAL_MEMO_FILES,
                rules: {
                    "outlayr/no-manual-memo": ["error", { allowManualMemo: true }],
                },
            },
            {
                files: ["apps/native/src/lib/app-icon.android.ts", "apps/native/src/navigation/stack-chrome.ts"],
                rules: {
                    "outlayr/no-hookless-use-function": "off",
                },
            },
            {
                files: HERMES_SOURCE,
                rules: {
                    "outlayr/no-hermes-unsupported-apis": "error",
                },
            },
            {
                files: ["apps/native/src/data/live-query.ts"],
                rules: {
                    "no-restricted-imports": [
                        "error",
                        { paths: [HAPTICS_IMPORT, SECURE_STORE_IMPORT, ...ICON_BARREL_IMPORTS] },
                    ],
                },
            },
            {
                files: ["apps/native/src/lib/use-haptics.ts", "apps/native/src/lib/use-haptics.android.ts"],
                rules: {
                    "no-restricted-imports": [
                        "error",
                        { paths: [LIVE_QUERY_IMPORT, SECURE_STORE_IMPORT, ...ICON_BARREL_IMPORTS] },
                    ],
                },
            },
            {
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
                files: [
                    "apps/native/src/lib/secure-storage.ts",
                    "apps/native/src/lib/cloud-runtime.ts",
                    "apps/native/src/lib/deletion-resume.test.ts",
                    "apps/native/src/lib/device-data-reset.test.ts",
                ],
                rules: {
                    "no-restricted-imports": [
                        "error",
                        { paths: NATIVE_RESTRICTED_IMPORTS.filter((entry) => entry !== SECURE_STORE_IMPORT) },
                    ],
                },
            },
            {
                files: ["apps/native/src/db/transaction.ts"],
                rules: {
                    "outlayr/no-drizzle-transaction": "off",
                },
            },
            {
                // Must stay after the import-sheet override so it wins there.
                files: NODE_SIDE_FILES,
                rules: {
                    "outlayr/bottom-sheet-background": "off",
                    "outlayr/editor-cta-busy": "off",
                    "outlayr/no-drizzle-transaction": "off",
                    "outlayr/no-hermes-unsupported-apis": "off",
                    "outlayr/no-hookless-use-function": "off",
                    "outlayr/no-manual-memo": "off",
                    "outlayr/no-sheet-repaint": "off",
                    "outlayr/swiftui-list-grounds": "off",
                    "outlayr/prefer-effect-fn": "off",
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
                files: TEST_FILES,
                rules: {
                    "outlayr/no-polling-loop-in-tests": "error",
                    "outlayr/no-test-in-loop": "error",
                },
            },
            {
                files: SHIPPED_SOURCE,
                excludeFiles: TEST_FILES,
                rules: {
                    "outlayr/no-em-dash-copy": "error",
                    "outlayr/react-effect-budget": "error",
                },
            },
            {
                files: ["**/*.live.test.ts"],
                rules: {
                    "outlayr/no-test-timeout-or-retry": "off",
                },
            },
            {
                files: ["apps/native/src/lib/convex.ts", "apps/native/src/data/sync-engine-core.ts"],
                rules: {
                    "anti-slop/no-chained-type-assertions": "off",
                },
            },
            {
                files: ["packages/backend/confect/lib/providerLifecycle.ts"],
                rules: {
                    "anti-slop/no-unknown-returns": "off",
                },
            },
        ],
        options: {
            reportUnusedDisableDirectives: "error",
        },
        rules: {
            complexity: ["error", { max: 35 }],
            eqeqeq: ["error", "always", { null: "ignore" }],
            "func-style": "off",
            "max-classes-per-file": "off",
            "no-eq-null": "off",
            "no-redeclare": "off",
            "no-use-before-define": ["error", { classes: false, functions: false, variables: false }],
            "node/global-require": "off",
            "one-var": ["error", "never"],
            "outlayr/no-inline-schema-compile": "error",
            "outlayr/no-low-value-comments": "error",
            "outlayr/no-slop-comments": "error",
            "outlayr/prefer-catch-tags": "error",
            "outlayr/prefer-effect-fn": "error",
            "outlayr/require-suppression-reason": "error",
            "prefer-named-capture-group": "off",
            "promise/avoid-new": "off",
            "promise/prefer-await-to-callbacks": "off",
            "promise/prefer-await-to-then": "off",
            ...Object.fromEntries(REACT_COMPILER_RULES.map((rule) => [`react/${rule}`, "error"])),
            "react/exhaustive-deps": "warn",
            "react/function-component-definition": "off",
            "react/hook-use-state": "off",
            "react/jsx-handler-names": "off",
            "react/style-prop-object": "off",
            "react/todo": "off",
            "require-await": "off",
            "require-unicode-regexp": "off",
            "tailwindcss/no-conflicting-classes": "error",
            "tailwindcss/no-contradicting-variants": "error",
            "tailwindcss/no-deprecated-classes": "error",
            "tailwindcss/no-duplicate-classes": "error",
            "tailwindcss/no-unknown-classes": ["error", { allowlist: ["ph-no-capture"] }],
            "tailwindcss/no-unnecessary-whitespace": "error",
            "typescript/consistent-type-imports": ["error", { disallowTypeAnnotations: false }],
            "unicorn/catch-error-name": "off",
            "unicorn/no-array-reduce": "off",
            "unicorn/no-array-reverse": "off",
            "unicorn/no-array-sort": "off",
            "unicorn/no-useless-undefined": "off",
            "unicorn/prefer-module": "off",
            "unicorn/prefer-number-coercion": "off",
            "unicorn/prefer-set-has": "off",
            "unicorn/throw-new-error": "off",
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
    staged: {
        "*.{js,jsx,mjs,cjs,ts,tsx,mts,cts,json,jsonc,css}": "vp check --fix",
    },
});
