import { describe, expect, it } from "vite-plus/test";

import { lint } from "./test-harness";

const messages = (diagnostics: { message: string }[]) => diagnostics.map(({ message }) => message);

describe("no-react-effects", () => {
    const effects = (source: string) => messages(lint("no-react-effects", "apps/site/src/Panel.tsx", source));

    it.each([
        ["a named import", 'import { useEffect } from "react";'],
        ["an aliased import", 'import { useLayoutEffect as useBeforePaint } from "react";'],
        ["an effect event", 'import { useEffectEvent } from "react";'],
        ["a namespace call", 'import * as React from "react";\nReact.useInsertionEffect(() => {});'],
        ["a computed member with a string key", 'import * as React from "react";\nReact["useEffect"](() => {});'],
        [
            "a computed member with a template key",
            'import * as React from "react";\nReact[`useLayoutEffect`](() => {});',
        ],
        ["a destructured hook", 'import * as React from "react";\nconst { useEffect } = React;'],
        ["an aliased destructured hook", 'import * as React from "react";\nconst { useLayoutEffect: later } = React;'],
        ["a re-export", 'export { useEffect } from "react";'],
        ["an aliased re-export", 'export { useEffect as u } from "react";'],
    ])("reports %s", (_, source) => {
        expect(effects(source)).toHaveLength(1);
    });

    it("ignores comments, strings, other modules and lookalike names", () => {
        const source = `// useEffect(() => {}) in a comment
import { useEffect } from "./lifecycle-shim";
export const label = "React.useEffect(() => {})";
export const pipeline = Effect.matchCauseEffect(effect, {});
`;
        expect(effects(source)).toStrictEqual([]);
    });

    it("ignores dynamic keys, non-hook destructuring and re-exports from other modules", () => {
        const source = `import * as React from "react";
const key = "useEffect";
React[key]();
React[\`use\${key}\`]();
const { useMemo } = React;
export { useEffect } from "./lifecycle-shim";
`;
        expect(effects(source)).toStrictEqual([]);
    });
});

describe("locked-rules", () => {
    const locked = (source: string) =>
        lint("locked-rules", "apps/site/src/Panel.tsx", source, { rules: ["outlayr/no-react-effects"] }).filter(
            ({ code }) => code?.includes("locked-rules")
        );

    it.each([
        [
            "a next-line directive with a reason",
            "// oxlint-disable-next-line no-bitwise, outlayr/no-react-effects -- why",
        ],
        ["a file directive", "/* eslint-disable outlayr/no-react-effects */"],
    ])("reports %s", (_, directive) => {
        expect(locked(`${directive}\nexport const value = 1 | 2;\n`)).toHaveLength(1);
    });

    it("leaves directives for other rules alone", () => {
        expect(
            locked("// oxlint-disable-next-line no-bitwise -- packs flags\nexport const value = 1 | 2;\n")
        ).toStrictEqual([]);
    });
});

describe("no-em-dash-copy", () => {
    const dash = (source: string) => lint("no-em-dash-copy", "apps/site/src/Example.tsx", source);

    it("allows em dashes in comments and regex literals", () => {
        expect(
            dash('// Parses titles like "Issue \u2014 Browser".\nexport const title = /^ [\u2013\u2014-] \\S/u;\n')
        ).toStrictEqual([]);
    });

    it("allows hyphens and en dashes", () => {
        expect(dash('export const label = "Refresh failed - retry 1\u20132";')).toStrictEqual([]);
    });

    it.each([
        ["a string literal", 'export const label = "Refresh failed \u2014 retry";'],
        ["an escaped string literal", 'export const label = "Refresh failed \\u2014 retry";'],
        ["a template literal", "export const label = `Refresh failed \u2014 retry`;"],
        ["JSX text", "export const node = <p>Run a prompt \u2014 on an interval</p>;"],
    ])("reports %s", (_, source) => {
        expect(messages(dash(source))).toStrictEqual([
            "No em dashes in product copy. Use a period, comma, colon, or parentheses instead.",
        ]);
    });
});

describe("no-misread-copy", () => {
    const misread = (source: string) => lint("no-misread-copy", "apps/site/src/content/example.content.ts", source);

    it.each([
        ["a language key", 't({ en: "in a sentence", es: "en una oración" });'],
        ["a regional key", 't({ "es-ES": "Oraciones cortas" });'],
        ["a template literal", "t({ es: `con una oración` });"],
    ])("reports the word under %s", (_, source) => {
        expect(messages(misread(source))).toStrictEqual([expect.stringContaining("Write “frase”")]);
    });

    it("leaves other languages and longer words alone", () => {
        expect(
            misread('t({ en: "oración", pt: "oración", es: "una oracionista", constructor: "oración" });')
        ).toStrictEqual([]);
    });
});

describe("no-test-in-loop", () => {
    const loop = (source: string, filename = "apps/native/src/Example.test.ts") =>
        lint("no-test-in-loop", filename, source);

    it.each([
        ["it", "for (const n of [1, 2]) {\n    it('case', () => {});\n}\n"],
        ["describe", "for (const n of [1, 2]) {\n    describe('case', () => {});\n}\n"],
        ["it.skip", "for (let n = 0; n < 2; n += 1) {\n    it.skip('case', () => {});\n}\n"],
    ])("reports %s declared in a for loop", (name, source) => {
        expect(messages(loop(source))).toStrictEqual([
            `Do not call ${name}(...) inside a for loop. Use ${name}.each(cases)(name, ...) instead.`,
        ]);
    });

    it("allows it.each and a loop inside a test body", () => {
        const source = `it.each([1, 2])("case %s", () => {});
it("walks cases", () => {
    for (const n of [1, 2]) {
        expect(n).toBeGreaterThan(0);
    }
});
`;
        expect(loop(source)).toStrictEqual([]);
    });

    it("skips files that are not tests", () => {
        expect(
            loop("for (const n of [1]) {\n    it('case', () => {});\n}\n", "apps/native/src/helper.ts")
        ).toStrictEqual([]);
    });
});

describe("no-polling-loop-in-tests", () => {
    const polling = (source: string, filename = "apps/native/src/Example.test.ts") =>
        lint("no-polling-loop-in-tests", filename, source);
    const tick = "await new Promise((resolve) => setTimeout(resolve, 10));";

    it.each([
        ["a predicate test", `while (!done()) {\n    ${tick}\n}\n`],
        ["a conditional exit", `for (;;) {\n    ${tick}\n    if (done()) {\n        break;\n    }\n}\n`],
        ["a resolved-promise spin", "while (calls.length < 1) {\n    await Promise.resolve();\n}\n"],
    ])("reports a loop spinning on a tick with %s", (_, body) => {
        expect(polling(`export async function wait() {\n${body}}\n`)).toHaveLength(1);
    });

    it("allows a fixed-count flush and a loop that never waits", () => {
        const source = `export async function flush() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
        await Promise.resolve();
    }
    while (!done()) {
        step();
    }
}
`;
        expect(polling(source)).toStrictEqual([]);
    });

    it("skips files that are not tests", () => {
        expect(polling(`while (!done()) {\n    ${tick}\n}\n`, "apps/native/src/helper.ts")).toStrictEqual([]);
    });
});
