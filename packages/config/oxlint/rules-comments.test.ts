import { describe, expect, it } from "vite-plus/test";

import { lint } from "./test-harness";

const messages = (diagnostics: { message: string }[]) => diagnostics.map(({ message }) => message);

describe("no-slop-comments", () => {
    const comments = (source: string) => lint("no-slop-comments", "packages/money/src/rates.ts", source);

    it("reports a comment block longer than three lines", () => {
        const source = "// one\n// two\n// three\n// four\nexport const rate = 1;\n";
        expect(messages(comments(source))).toStrictEqual([
            "Comments get three lines at most. Keep the one thing the code can't show; longer reasoning belongs in the commit message or docs/internals.",
        ]);
    });

    it("reports an em dash in a comment", () => {
        expect(
            messages(comments("// Rates come from the server \u2014 never cached.\nexport const rate = 1;\n"))
        ).toStrictEqual(["No em dashes in comments. Use a colon, a comma, a period or parentheses."]);
    });

    it("reports a comment line past 120 columns", () => {
        expect(messages(comments(`// ${"x".repeat(130)}\nexport const rate = 1;\n`))).toStrictEqual([
            "Wrap the comment at 120 columns, so three lines stay three lines.",
        ]);
    });

    it("allows three lines and a long line that holds a URL", () => {
        const source = `// one
// two
// ${"x".repeat(130)} https://example.com
export const rate = 1;
`;
        expect(comments(source)).toStrictEqual([]);
    });
});

describe("no-low-value-comments", () => {
    const comments = (source: string) => lint("no-low-value-comments", "packages/money/src/rates.ts", source);

    it.each([
        [
            "a section divider",
            "// ----------------------------------------\nexport const rate = 1;\n",
            "Drop the section divider",
        ],
        ["a test step label", "// arrange\nconst rate = 1;\n", "Drop the test step label"],
        [
            "a TODO with no issue link",
            "// TODO: cache this\nexport const rate = 1;\n",
            "Link the issue that tracks this",
        ],
        ["a comment that repeats the name below", "// rate\nconst rate = 1;\n", "it only repeats the name below it"],
        ["commented-out code", "// const rate = 1;\nexport const other = 2;\n", "Delete commented-out code"],
        ["a JSDoc type", "/** @param {string} name */\nexport const rate = 1;\n", "Drop the JSDoc type"],
        [
            "an empty JSDoc tag",
            "/** @param name */\nexport const rate = 1;\n",
            "Drop the JSDoc tag that has no description",
        ],
    ])("reports %s", (_, source, fragment) => {
        expect(messages(comments(source))).toStrictEqual([expect.stringContaining(fragment)]);
    });

    it("allows a comment that explains why and a linked TODO", () => {
        const source = `// The server sends cents, so the display layer divides by 100.
// TODO: https://example.com/issues/4 tracks the timezone shift.
const rate = 1;
`;
        expect(comments(source)).toStrictEqual([]);
    });
});

describe("no-test-timeout-or-retry", () => {
    const tests = (source: string) => lint("no-test-timeout-or-retry", "apps/native/src/lib/rates.test.ts", source);
    const MESSAGE =
        "A per-test timeout or retry hides a wait that should be awaited. Remove it and await what the test is waiting for; only `*.live.test.ts` model probes may take longer.";

    it.each([
        ["a test's timeout argument", 'it("loads", () => {}, 5000);'],
        ["a test's options object", 'it("loads", { timeout: 5000 }, () => {});'],
        ["a hook's timeout argument", "beforeEach(() => {}, 1000);"],
        ["a vi.setConfig timeout", "vi.setConfig({ testTimeout: 5000 });"],
        ["a jest.setTimeout", "jest.setTimeout(5000);"],
    ])("reports %s", (_, source) => {
        expect(messages(tests(source))).toStrictEqual([MESSAGE]);
    });

    it("allows a plain test and a config without timeout or retry", () => {
        const source = `it("loads", () => {});
it.each([1, 2])("loads %s", (n) => {});
beforeEach(() => {});
vi.setConfig({ bail: 1 });
`;
        expect(tests(source)).toStrictEqual([]);
    });
});

describe("require-suppression-reason", () => {
    const directives = (source: string) => lint("require-suppression-reason", "packages/money/src/rates.ts", source);
    // An unused oxlint directive is its own diagnostic under the harness config, so keep only the rule's message.
    const reasons = (source: string) => messages(directives(source)).filter((message) => message.startsWith("Say why"));

    it("reports an oxlint directive with no reason", () => {
        expect(reasons("// oxlint-disable-next-line no-bitwise\nconst mask = 1;\n")).toStrictEqual([
            "Say why: end the directive with `-- reason` or put a comment on the line above.",
        ]);
    });

    it("reports a TypeScript directive with no reason", () => {
        expect(reasons("// @ts-ignore\nconst value = 2;\n")).toStrictEqual([
            "Say why: write the reason after the directive or in a comment on the line above.",
        ]);
    });

    it("allows an inline reason and a reason on the line above", () => {
        const source = `// oxlint-disable-next-line no-bitwise -- masks the low byte
const mask = 1;
// the package ships no types
// @ts-ignore
const value = 2;
`;
        expect(reasons(source)).toStrictEqual([]);
    });
});
