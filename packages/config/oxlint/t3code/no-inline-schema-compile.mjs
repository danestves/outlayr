// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/no-inline-schema-compile.ts under the MIT License in ./LICENSE.

const COMPILER_METHODS = new Set([
    "asserts",
    "decodeEffect",
    "decodeExit",
    "decodeOption",
    "decodePromise",
    "decodeResult",
    "decodeSync",
    "decodeUnknownEffect",
    "decodeUnknownExit",
    "decodeUnknownOption",
    "decodeUnknownPromise",
    "decodeUnknownResult",
    "decodeUnknownSync",
    "encodeEffect",
    "encodeExit",
    "encodeOption",
    "encodePromise",
    "encodeResult",
    "encodeSync",
    "encodeUnknownEffect",
    "encodeUnknownExit",
    "encodeUnknownOption",
    "encodeUnknownPromise",
    "encodeUnknownResult",
    "encodeUnknownSync",
    "is",
]);

const WRAPPERS = new Set([
    "ChainExpression",
    "ParenthesizedExpression",
    "TSAsExpression",
    "TSNonNullExpression",
    "TSTypeAssertion",
]);

const unwrap = (node) => {
    let current = node;
    while (current != null && WRAPPERS.has(current.type)) {
        current = current.expression;
    }
    return current ?? null;
};

const propertyName = (node) => (node?.type === "Identifier" ? node.name : null);

const isSchemaIdentifier = (node) => node?.type === "Identifier" && node.name === "Schema";

const schemaMember = (callee) => {
    const expression = unwrap(callee);
    return expression?.type === "MemberExpression" && isSchemaIdentifier(unwrap(expression.object)) ? expression : null;
};

const isStaticSchemaReference = (node) => {
    const expression = unwrap(node);
    if (expression?.type === "Identifier") {
        const [firstChar] = expression.name;
        return firstChar !== undefined && firstChar.toUpperCase() === firstChar;
    }
    return expression?.type === "MemberExpression";
};

const isNestedStaticSchemaCall = (node) => {
    const expression = unwrap(node);
    if (expression?.type !== "CallExpression") {
        return false;
    }
    const member = schemaMember(expression.callee);
    if (member === null) {
        return false;
    }
    if (propertyName(member.property) === "fromJsonString") {
        const [firstArg] = expression.arguments;
        return isStaticSchemaReference(firstArg) || isNestedStaticSchemaCall(firstArg);
    }
    return true;
};

const isImmediatelyInvoked = (node) => {
    const expression = unwrap(node);
    const parent = unwrap(expression?.parent);
    return parent?.type === "CallExpression" && unwrap(parent.callee) === expression;
};

const messageHigh = (method) =>
    `Hoist Schema.${method}(...) to module scope: both the inline schema literal and the compiled function are rebuilt on every call. Move the compiled function to a module-level const.`;

const messageMedium = (method) =>
    `Hoist Schema.${method}(...) to module scope: the compiled function is rebuilt on every call. Move it to a module-level const.`;

export default {
    createOnce(context) {
        let functionDepth = 0;
        const enterFunction = () => {
            functionDepth += 1;
        };
        const exitFunction = () => {
            functionDepth -= 1;
        };

        return {
            ArrowFunctionExpression: enterFunction,
            "ArrowFunctionExpression:exit": exitFunction,
            before() {
                functionDepth = 0;
            },
            CallExpression(node) {
                if (functionDepth === 0) {
                    return;
                }
                const member = schemaMember(node.callee);
                const method = member === null ? null : propertyName(member.property);
                if (method === null || !COMPILER_METHODS.has(method) || !isImmediatelyInvoked(node)) {
                    return;
                }
                const [firstArg] = node.arguments;
                const high = firstArg !== undefined && isNestedStaticSchemaCall(firstArg);
                if (!high && !isStaticSchemaReference(firstArg)) {
                    return;
                }
                context.report({ message: high ? messageHigh(method) : messageMedium(method), node: node.callee });
            },
            FunctionDeclaration: enterFunction,
            "FunctionDeclaration:exit": exitFunction,
            FunctionExpression: enterFunction,
            "FunctionExpression:exit": exitFunction,
        };
    },
    meta: {
        docs: {
            description:
                "Disallow Schema decoder/encoder compiler calls inside function bodies; hoist them to module scope.",
        },
        type: "problem",
    },
};
