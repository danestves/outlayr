import { globSync, readFileSync, writeFileSync } from "node:fs";

import ts from "typescript";

const BUDGET_FILE = new URL("effect-budget.json", import.meta.url);
const EFFECT_HOOKS = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);
const SOURCE_GLOBS = ["apps/native/src/**/*.{ts,tsx}", "apps/web/src/**/*.{ts,tsx}", "packages/*/src/**/*.{ts,tsx}"];
const TEST_FILE = /\.test\.[cm]?[jt]sx?$|[\\/](?:test|__tests__)[\\/]/u;
const JUSTIFIED = /oxlint-disable-next-line[^\n]*outlayr\/react-effect-budget\s+--\s*\S/u;

const calleeName = (callee) => (ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText());

const countEffects = (file) => {
    const text = readFileSync(file, "utf-8");
    const lines = text.split("\n");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    let count = 0;
    const visit = (node) => {
        if (ts.isCallExpression(node) && EFFECT_HOOKS.has(calleeName(node.expression))) {
            const { line } = source.getLineAndCharacterOfPosition(node.getStart());
            if (!JUSTIFIED.test(lines[line - 1] ?? "")) {
                count += 1;
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return count;
};

const counts = Object.fromEntries(
    SOURCE_GLOBS.flatMap((pattern) => globSync(pattern))
        .filter((file) => !TEST_FILE.test(file))
        .toSorted()
        .map((file) => [file, countEffects(file)])
        .filter(([, count]) => count > 0)
);

if (process.argv.includes("--write")) {
    writeFileSync(BUDGET_FILE, `${JSON.stringify(counts, null, 4)}\n`);
} else {
    const budgets = JSON.parse(readFileSync(BUDGET_FILE, "utf-8"));
    for (const [file, budget] of Object.entries(budgets)) {
        const real = counts[file] ?? 0;
        if (real < budget) {
            console.log(`${file}: ${real} of ${budget}`);
        }
    }
}
