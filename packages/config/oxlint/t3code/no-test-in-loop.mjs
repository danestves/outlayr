// Ported from https://github.com/pingdotgg/t3code/blob/3f9448747bb8848050dc2cacf83affa6f94a66a1/oxlint-plugin-t3code/rules/no-test-in-loop.ts under the MIT License in ./LICENSE.

const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const NODE_TEST_IMPORT_PATTERN = /["']node:test["']/u;
const TEST_FUNCTIONS = new Set(["describe", "it", "suite", "test"]);
const EACH_CAPABLE_MODIFIERS = new Set(["only", "skip"]);
const LOOPS = new Set(["ForStatement", "ForInStatement", "ForOfStatement"]);
const FUNCTIONS = new Set(["ArrowFunctionExpression", "FunctionExpression", "FunctionDeclaration"]);

const testCallName = (callee) => {
    if (callee.type === "Identifier") {
        return TEST_FUNCTIONS.has(callee.name) ? callee.name : null;
    }
    if (callee.type !== "MemberExpression" || callee.computed) {
        return null;
    }
    const { object, property } = callee;
    const modified =
        object.type === "Identifier" &&
        TEST_FUNCTIONS.has(object.name) &&
        property.type === "Identifier" &&
        EACH_CAPABLE_MODIFIERS.has(property.name);
    return modified ? `${object.name}.${property.name}` : null;
};

const isInsideLoop = (node) => {
    let current = node.parent;
    while (current) {
        if (LOOPS.has(current.type)) {
            return true;
        }
        if (FUNCTIONS.has(current.type)) {
            return false;
        }
        current = current.parent;
    }
    return false;
};

export default {
    create(context) {
        if (!TEST_FILE_PATTERN.test(context.filename) || NODE_TEST_IMPORT_PATTERN.test(context.sourceCode.text)) {
            return {};
        }
        return {
            CallExpression(node) {
                const name = testCallName(node.callee);
                if (name === null || !isInsideLoop(node)) {
                    return;
                }
                context.report({
                    message: `Do not call ${name}(...) inside a for loop. Use ${name}.each(cases)(name, ...) instead.`,
                    node: node.callee,
                });
            },
        };
    },
    meta: {
        docs: { description: "Disallow declaring tests inside a for loop; use it.each or describe.each instead." },
        type: "suggestion",
    },
};
