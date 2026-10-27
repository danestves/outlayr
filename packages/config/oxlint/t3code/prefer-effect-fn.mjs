// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/prefer-effect-fn.ts under the MIT License in ./LICENSE.

const PASSTHROUGH_COMBINATORS = new Set(["catchTags", "match", "matchCauseEffect", "matchEffect"]);

const importedName = (specifier) =>
    specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value;

const keyName = (key) => {
    if (key.type === "Identifier") {
        return key.name;
    }
    return key.type === "Literal" ? key.value : undefined;
};

const isReusableSite = (node) => {
    if (node.type === "FunctionDeclaration") {
        return true;
    }
    const { parent } = node;
    if (parent.type === "MethodDefinition") {
        return parent.kind === "method";
    }
    if (parent.type === "Property") {
        if (parent.kind !== "init") {
            return false;
        }
        const call = parent.parent.parent;
        if (call?.type === "CallExpression") {
            let { callee } = call;
            while (callee.type === "CallExpression") {
                ({ callee } = callee);
            }
            if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
                const { name } = callee.property;
                if (
                    PASSTHROUGH_COMBINATORS.has(name) ||
                    (keyName(parent.key) === "defaultValue" && name === "Reference")
                ) {
                    return false;
                }
            }
        }
        return true;
    }
    return parent.type === "VariableDeclarator" || parent.type === "PropertyDefinition";
};

export default {
    create(context) {
        const isEffectImport = (identifier, member) => {
            let scope = context.sourceCode.getScope(identifier);
            for (;;) {
                const variable = scope.set.get(identifier.name);
                if (variable !== undefined) {
                    return variable.defs.some((def) => {
                        if (def.type !== "ImportBinding" || def.parent?.type !== "ImportDeclaration") {
                            return false;
                        }
                        const source = def.parent.source.value;
                        if (source === "effect/Effect") {
                            if (member === "") {
                                return def.node.type === "ImportSpecifier" && importedName(def.node) === "gen";
                            }
                            return def.node.type === "ImportNamespaceSpecifier";
                        }
                        return (
                            source === "effect" &&
                            def.node.type === "ImportSpecifier" &&
                            importedName(def.node) === "Effect"
                        );
                    });
                }
                if (scope.upper === null) {
                    return false;
                }
                scope = scope.upper;
            }
        };

        const isGeneratorCall = (expression) => {
            if (expression.type !== "CallExpression") {
                return false;
            }
            const { callee } = expression;
            if (callee.type === "Identifier") {
                return isEffectImport(callee, "");
            }
            if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") {
                return false;
            }
            if (callee.property.name === "pipe") {
                return isGeneratorCall(callee.object);
            }
            return (
                callee.property.name === "gen" &&
                callee.object.type === "Identifier" &&
                isEffectImport(callee.object, "gen")
            );
        };

        const check = (node) => {
            if (node.async || node.generator || !isReusableSite(node) || node.body === null) {
                return;
            }
            const { body } = node;
            let expression = body;
            if (body.type === "BlockStatement") {
                if (body.body.length !== 1 || body.body[0]?.type !== "ReturnStatement") {
                    return;
                }
                expression = body.body[0].argument;
            }
            if (expression === null || !isGeneratorCall(expression)) {
                return;
            }
            context.report({
                message:
                    'Use Effect.fn("Module.operation") for reusable Effect functions. Reserve Effect.fnUntraced for documented hot paths or an existing span; keep Effect.gen for inline programs.',
                node,
            });
        };

        return { ArrowFunctionExpression: check, FunctionDeclaration: check, FunctionExpression: check };
    },
    meta: {
        docs: { description: "Use Effect.fn for reusable generator-based Effect functions." },
        type: "suggestion",
    },
};
