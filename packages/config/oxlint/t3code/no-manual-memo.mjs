// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/no-manual-memo.ts under the MIT License in ./LICENSE.

const MANUAL_MEMO_CALLS = new Set(["memo", "useCallback", "useMemo"]);
const MEMO_DIRECTIVES = new Set(["use memo", "use no memo", "use no forget"]);

const readAllowManualMemo = (options) => options[0]?.allowManualMemo === true;

const manualMemoName = (callee) => {
    if (callee.type === "Identifier") {
        return MANUAL_MEMO_CALLS.has(callee.name) ? callee.name : null;
    }
    if (
        callee.type === "MemberExpression" &&
        !callee.computed &&
        callee.object.type === "Identifier" &&
        callee.object.name === "React" &&
        callee.property.type === "Identifier" &&
        MANUAL_MEMO_CALLS.has(callee.property.name)
    ) {
        return callee.property.name;
    }
    return null;
};

export default {
    create(context) {
        const allowManualMemo = readAllowManualMemo(context.options);
        return {
            CallExpression(node) {
                if (allowManualMemo) {
                    return;
                }
                const name = manualMemoName(node.callee);
                if (name === null) {
                    return;
                }
                context.report({
                    message: `Drop ${name}: the React Compiler memoizes this file. Write the plain value, function or component.`,
                    node: node.callee,
                });
            },
            ExpressionStatement(node) {
                if (!MEMO_DIRECTIVES.has(node.directive)) {
                    return;
                }
                context.report({
                    message:
                        node.directive === "use memo"
                            ? 'Drop "use memo": restructure so the compiler caches this on its own, e.g. move plain uses of a value before the hook call that splits its scope, or inline the helper.'
                            : `Drop "${node.directive}": fix the code the compiler cannot prove safe instead of skipping it.`,
                    node,
                });
            },
        };
    },
    meta: {
        defaultOptions: [{ allowManualMemo: false }],
        docs: {
            description:
                "Disallow useCallback, useMemo, memo and memo directives in files the React Compiler must compile; it memoizes them.",
        },
        schema: [
            {
                additionalProperties: false,
                properties: {
                    allowManualMemo: {
                        description:
                            "Still permit useMemo, useCallback and memo while a file ratchets toward full compiler coverage; directives stay banned.",
                        type: "boolean",
                    },
                },
                type: "object",
            },
        ],
        type: "suggestion",
    },
};
