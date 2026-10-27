import { readFileSync } from "node:fs";

import { describe, expect, it } from "vite-plus/test";

import { lint } from "./test-harness";

const budgets: Record<string, number> = JSON.parse(
    readFileSync(new URL("../../../scripts/effect-budget.json", import.meta.url), "utf-8")
);
const [budgeted, allowed] = Object.entries(budgets).find(([file]) => /^[\w./-]+$/u.test(file)) ?? [];
if (budgeted === undefined || allowed === undefined) {
    throw new Error("scripts/effect-budget.json has no budgeted file with a plain path");
}

const component = (effects: number) => `import React, { useEffect } from "react";
export function Panel() {
${Array.from({ length: effects }, (_, index) => (index % 2 === 0 ? "    useEffect(() => {}, []);" : "    React.useLayoutEffect(() => {});")).join("\n")}
    return null;
}
`;

const budget = (filename: string, source: string) => lint("react-effect-budget", filename, source);
const messages = (diagnostics: { message: string }[]) => diagnostics.map(({ message }) => message);

describe("react-effect-budget", () => {
    it("passes a file at its budget", () => {
        expect(budget(budgeted, component(allowed))).toStrictEqual([]);
    });

    it("reports only the calls past the budget", () => {
        const reported = messages(budget(budgeted, component(allowed + 2)));
        expect(reported).toHaveLength(2);
        expect(reported[0]).toContain(`has ${allowed + 2} React effects against a budget of ${allowed}`);
        expect(reported[0]).toContain("outlayr/react-effect-budget");
    });

    it("gives a file without an entry a budget of 0 and counts member calls", () => {
        const reported = messages(
            budget(
                "apps/web/src/NotInTheBudget.tsx",
                "export const New = () => { React.useEffect(() => {}); return null; };"
            )
        );
        expect(reported).toHaveLength(1);
        expect(reported[0]).toContain("has 1 React effect against a budget of 0");
    });

    it("ignores comments, strings and lookalike names", () => {
        const source = `// useEffect(() => {}) in a comment
/* React.useLayoutEffect(() => {}) */
export const label = "useEffect(() => {})";
export const pipeline = Effect.matchCauseEffect(effect, {});
export const alias = useEffect;
`;
        expect(budget("apps/web/src/Lookalikes.tsx", source)).toStrictEqual([]);
    });

    it("does not count an effect that states its reason, and uses its directive", () => {
        const source = `export function New() {
    // oxlint-disable-next-line outlayr/react-effect-budget -- subscribes to the window's resize events
    React.useEffect(() => {});
    return null;
}
`;
        expect(budget("apps/web/src/New.tsx", source)).toStrictEqual([]);
    });

    it("still counts an effect whose line above is not a reasoned directive", () => {
        const source = `export function New() {
    // subscribes to the window's resize events
    React.useEffect(() => {});
    return null;
}
`;
        expect(budget("apps/web/src/New.tsx", source)).toHaveLength(1);
    });

    it("skips test files", () => {
        expect(budget("apps/web/src/Panel.test.tsx", component(3))).toStrictEqual([]);
    });
});

describe("no-em-dash-copy", () => {
    const dash = (source: string) => lint("no-em-dash-copy", "apps/web/src/Example.tsx", source);

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
