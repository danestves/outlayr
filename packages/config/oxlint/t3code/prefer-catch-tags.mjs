// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/prefer-catch-tags.ts under the MIT License in ./LICENSE.

const MESSAGE = "Catch known tags with `Effect.catchTags({ Tag: handler })`, even for one tag.";

export default {
    create(context) {
        const isEffectNamespace = (identifier) => {
            let scope = context.sourceCode.getScope(identifier);
            for (;;) {
                const variable = scope.set.get(identifier.name);
                if (variable !== undefined) {
                    return variable.defs.some(
                        (def) =>
                            def.type === "ImportBinding" &&
                            def.node.type === "ImportNamespaceSpecifier" &&
                            def.parent?.type === "ImportDeclaration" &&
                            def.parent.source.value === "effect/Effect"
                    );
                }
                if (scope.upper === null) {
                    return false;
                }
                scope = scope.upper;
            }
        };

        return {
            ImportDeclaration(node) {
                if (node.source.value !== "effect/Effect") {
                    return;
                }
                for (const specifier of node.specifiers) {
                    const imported =
                        specifier.type === "ImportSpecifier"
                            ? (specifier.imported.name ?? specifier.imported.value)
                            : undefined;
                    if (imported === "catchTag") {
                        context.report({ message: MESSAGE, node: specifier });
                    }
                }
            },
            MemberExpression(node) {
                if (
                    !node.computed &&
                    node.object.type === "Identifier" &&
                    node.property.type === "Identifier" &&
                    node.property.name === "catchTag" &&
                    isEffectNamespace(node.object)
                ) {
                    context.report({ message: MESSAGE, node });
                }
            },
        };
    },
    meta: {
        docs: { description: "Require `Effect.catchTags` over `Effect.catchTag`." },
        type: "suggestion",
    },
};
