// Ported from https://github.com/pingdotgg/t3code/blob/40ec16a9b6557d97b2eb33fea3784cb0c577be62/oxlint-plugin-t3code/rules/require-suppression-reason.ts under the MIT License in ./LICENSE.

const DIRECTIVE_PATTERN =
    /^\s*\*?\s*(?:(?:oxlint|eslint)-(?:disable|enable)|@ts-(?:expect-error|ignore|nocheck)|@effect-diagnostics)/u;
const TS_DIRECTIVE_PATTERN = /^\s*\*?\s*@ts-(?:expect-error|ignore|nocheck)(?![\w-])(.*)$/su;
const EMPTY_COMMENT_PATTERN = /^[\s*]*$/u;

export default {
    create(context) {
        const { sourceCode } = context;
        return {
            Program() {
                const comments = sourceCode.getAllComments();
                const ownLineCommentsByEndLine = new Map();
                for (const comment of comments) {
                    const { column, line } = comment.loc.start;
                    if ((sourceCode.lines[line - 1] ?? "").slice(0, column).trim() === "") {
                        ownLineCommentsByEndLine.set(comment.loc.end.line, comment);
                    }
                }

                const explainedAbove = (directive) => {
                    let above = ownLineCommentsByEndLine.get(directive.loc.start.line - 1);
                    while (above && (DIRECTIVE_PATTERN.test(above.value) || EMPTY_COMMENT_PATTERN.test(above.value))) {
                        above = ownLineCommentsByEndLine.get(above.loc.start.line - 1);
                    }
                    return above !== undefined;
                };

                for (const directive of sourceCode.getDisableDirectives().directives) {
                    if (
                        directive.type === "enable" ||
                        directive.justification?.trim() ||
                        explainedAbove(directive.node)
                    ) {
                        continue;
                    }
                    context.report({
                        loc: directive.node.loc,
                        message: "Say why: end the directive with `-- reason` or put a comment on the line above.",
                    });
                }

                for (const comment of comments) {
                    const after = TS_DIRECTIVE_PATTERN.exec(comment.value)?.[1];
                    if (after === undefined || after.replace(/^[\s:-]+/u, "").trim() || explainedAbove(comment)) {
                        continue;
                    }
                    context.report({
                        loc: comment.loc,
                        message: "Say why: write the reason after the directive or in a comment on the line above.",
                    });
                }
            },
        };
    },
    meta: {
        docs: { description: "Require every lint or type-checker suppression to say why." },
        type: "suggestion",
    },
};
