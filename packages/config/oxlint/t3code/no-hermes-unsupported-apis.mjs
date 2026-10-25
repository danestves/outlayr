// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/no-hermes-unsupported-apis.ts under the MIT License in ./LICENSE.

const UNSUPPORTED_GLOBAL_APIS = new Map([
    ["Intl.Segmenter", "Use a portable implementation or a simpler character-counting approximation."],
]);

const UNSUPPORTED_METHODS = new Map([
    ["toSorted", "Hermes does not implement Array#toSorted. Copy the array first: [...array].sort(...)."],
]);

const memberName = (node) => {
    const { property } = node;
    if (!node.computed && property.type === "Identifier") {
        return property.name;
    }
    if (property.type === "Literal") {
        return String(property.value);
    }
    if (property.type === "TemplateLiteral" && property.expressions.length === 0) {
        return property.quasis[0]?.value.cooked ?? null;
    }
    return null;
};

const globalApiPath = (node) => {
    if (node.type === "Identifier") {
        return node.name;
    }
    if (node.type !== "MemberExpression") {
        return null;
    }
    const object = globalApiPath(node.object);
    const property = memberName(node);
    if (object === null || property === null) {
        return null;
    }
    return ["globalThis", "global", "window"].includes(object) ? property : `${object}.${property}`;
};

export default {
    create(context) {
        const checkApi = (node) => {
            const path = globalApiPath(node.callee);
            const replacement = path === null ? undefined : UNSUPPORTED_GLOBAL_APIS.get(path);
            if (replacement !== undefined) {
                context.report({ message: `Hermes does not implement ${path}. ${replacement}`, node: node.callee });
                return;
            }
            if (node.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
                return;
            }
            const name = memberName(node.callee);
            const message = name === null ? undefined : UNSUPPORTED_METHODS.get(name);
            if (message !== undefined) {
                context.report({ message, node: node.callee.property });
            }
        };
        return { CallExpression: checkApi, NewExpression: checkApi };
    },
    meta: {
        docs: { description: "Disallow APIs that Hermes does not implement in code the native app ships." },
        type: "problem",
    },
};
