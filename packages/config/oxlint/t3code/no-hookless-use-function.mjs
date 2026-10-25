// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/no-hookless-use-function.ts under the MIT License in ./LICENSE.

const HOOK_NAME = /^use[A-Z]/u;
const HOOK_CALLEE = /^use(?:[A-Z]|$)/u;

const isFunctionNode = (node) =>
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression";

const isHookCallee = (callee) => {
    if (callee.type === "Identifier") {
        return HOOK_CALLEE.test(callee.name);
    }
    if (callee.type === "MemberExpression" && !callee.computed) {
        return callee.property.type === "Identifier" && HOOK_CALLEE.test(callee.property.name);
    }
    return false;
};

const callsHook = (node, root) => {
    if (Array.isArray(node)) {
        return node.some((child) => callsHook(child, root));
    }
    if (node?.type === undefined) {
        return false;
    }
    if (node !== root && isFunctionNode(node)) {
        return false;
    }
    if (node.type === "CallExpression" && isHookCallee(node.callee)) {
        return true;
    }
    return Object.entries(node).some(([key, value]) => key !== "parent" && callsHook(value, root));
};

export default {
    create(context) {
        const check = (name, fn, reportNode) => {
            if (!HOOK_NAME.test(name) || callsHook(fn.body, fn)) {
                return;
            }
            context.report({
                message: `"${name}" calls no hooks, so the React Compiler skips it and whatever it returns is rebuilt on every render. Rename it to a plain function, or read the hook it depends on inside it.`,
                node: reportNode,
            });
        };
        return {
            FunctionDeclaration(node) {
                if (node.id) {
                    check(node.id.name, node, node.id);
                }
            },
            VariableDeclarator(node) {
                if (node.id.type !== "Identifier" || node.init == null) {
                    return;
                }
                if (node.init.type !== "ArrowFunctionExpression" && node.init.type !== "FunctionExpression") {
                    return;
                }
                check(node.id.name, node.init, node.id);
            },
        };
    },
    meta: {
        docs: {
            description:
                "Disallow use* functions that call no hooks; the React Compiler only compiles functions that do.",
        },
        schema: [],
        type: "problem",
    },
};
