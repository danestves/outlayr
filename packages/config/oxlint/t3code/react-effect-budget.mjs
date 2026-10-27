// Ported from https://github.com/pingdotgg/t3code/blob/3f9448747bb8848050dc2cacf83affa6f94a66a1/oxlint-plugin-t3code/rules/react-effect-budget.ts under the MIT License in ./LICENSE.

import { readFileSync } from "node:fs";

const BUDGET_FILE = "scripts/effect-budget.json";
const EFFECT_HOOKS = new Set(["useEffect", "useLayoutEffect", "useInsertionEffect"]);
const EFFECT_HOOK_TEXT = /use(?:Layout|Insertion)?Effect/u;
const UNBUDGETED_FILE = /\.test\.[cm]?[jt]sx?$|[\\/](?:test|__tests__)[\\/]/u;
const JUSTIFIED = /oxlint-disable-next-line[^\n]*outlayr\/react-effect-budget\s+--\s*\S/u;

const budgets = JSON.parse(readFileSync(new URL(`../../../../${BUDGET_FILE}`, import.meta.url), "utf-8"));

const isJustified = (lines, line) => JUSTIFIED.test(lines[line - 2] ?? "");

const unwrap = (node) => {
    let current = node;
    while (
        current?.type === "ChainExpression" ||
        current?.type === "ParenthesizedExpression" ||
        current?.type === "TSNonNullExpression" ||
        current?.type === "TSAsExpression" ||
        current?.type === "TSTypeAssertion"
    ) {
        current = current.expression;
    }
    return current;
};

const isEffectHookCall = (node) => {
    const callee = unwrap(node.callee);
    if (callee?.type === "Identifier") {
        return EFFECT_HOOKS.has(callee.name);
    }
    if (callee?.type === "MemberExpression" && !callee.computed) {
        return callee.property.type === "Identifier" && EFFECT_HOOKS.has(callee.property.name);
    }
    return false;
};

const budgetFor = (filename) => {
    const normalized = filename.replaceAll("\\", "/");
    const key = Object.keys(budgets).find((file) => normalized.endsWith(`/${file}`));
    return key === undefined ? 0 : budgets[key];
};

export default {
    create(context) {
        if (UNBUDGETED_FILE.test(context.filename) || !EFFECT_HOOK_TEXT.test(context.sourceCode.text)) {
            return {};
        }
        const lines = context.sourceCode.text.split("\n");
        const calls = [];
        const justified = [];
        return {
            CallExpression(node) {
                if (!isEffectHookCall(node)) {
                    return;
                }
                (isJustified(lines, node.loc.start.line) ? justified : calls).push(node);
            },
            "Program:exit"() {
                for (const node of justified) {
                    context.report({ message: "A React effect with a stated reason.", node });
                }
                const allowed = budgetFor(context.filename);
                if (calls.length <= allowed) {
                    return;
                }
                const message =
                    `This file has ${calls.length} React ${calls.length === 1 ? "effect" : "effects"} against a budget of ${allowed}. ` +
                    "First ask whether this is synchronization that belongs in render or in the handler that causes it. " +
                    "If an effect is the honest model, say why on the line above it: " +
                    "`// oxlint-disable-next-line outlayr/react-effect-budget -- <why>`.";
                for (const node of calls.slice(allowed)) {
                    context.report({ message, node });
                }
            },
        };
    },
    meta: {
        docs: {
            description: `Hold each file to the React effect hooks it is allowed in ${BUDGET_FILE}; a missing entry allows none.`,
        },
        type: "suggestion",
    },
};
