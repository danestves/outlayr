// Ported from https://github.com/pingdotgg/t3code/blob/3f9448747bb8848050dc2cacf83affa6f94a66a1/oxlint-plugin-t3code/rules/no-em-dash-copy.ts under the MIT License in ./LICENSE.

const EM_DASH = "\u2014";

const MESSAGE = "No em dashes in product copy. Use a period, comma, colon, or parentheses instead.";

export default {
    create(context) {
        const check = (node, text) => {
            if (text?.includes(EM_DASH)) {
                context.report({ message: MESSAGE, node });
            }
        };
        return {
            JSXText(node) {
                check(node, node.value);
            },
            Literal(node) {
                // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an ESTree Literal is the boundary: its value is a string, number, boolean, null or regex by node shape
                if (typeof node.value === "string") {
                    check(node, node.value);
                }
            },
            TemplateElement(node) {
                check(node, node.value.cooked);
            },
        };
    },
    meta: {
        docs: { description: "Disallow em dashes in strings and JSX text that users read." },
        type: "suggestion",
    },
};
