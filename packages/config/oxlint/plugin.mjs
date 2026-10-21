// Registered from the root vite.config.ts as `outlayr/*`. See docs/internals/linting.md, "outlayr".

import noLowValueComments from "./t3code/no-low-value-comments.mjs";

const isIdentifier = (node, name) => node?.type === "Identifier" && node.name === name;
const isJsxName = (node, names) => node?.type === "JSXIdentifier" && names.includes(node.name);

// drizzle-orm/expo-sqlite never awaits the transaction callback, so an async body commits an empty
// `begin; commit;` and every statement runs unprotected. tsc cannot see it.
const noDrizzleTransaction = {
    create(context) {
        return {
            CallExpression(node) {
                const { callee } = node;
                if (
                    callee.type === "MemberExpression" &&
                    !callee.computed &&
                    isIdentifier(callee.property, "transaction")
                ) {
                    context.report({ messageId: "banned", node: callee.property });
                }
            },
        };
    },
    meta: {
        docs: {
            description: "Disallow drizzle's own `.transaction()`; use `withTransaction` from `@/db/transaction`.",
        },
        messages: {
            banned: "drizzle's `.transaction()` commits before an async callback runs. Use `withTransaction` from `@/db/transaction`.",
        },
        type: "problem",
    },
};

// A SwiftUI List or Form paints systemGroupedBackground below any token, with rows on a second system
// fill. Neither shows in a rendered tree, so a screen that forgets them ships on iOS's grey.
const swiftuiListGrounds = {
    create(context) {
        let list = null;
        const seen = new Set();
        return {
            CallExpression(node) {
                if (node.callee.type === "Identifier") {
                    seen.add(node.callee.name);
                }
            },
            JSXOpeningElement(node) {
                if (list === null && isJsxName(node.name, ["List", "Form"])) {
                    list = node;
                }
            },
            "Program:exit"() {
                if (list === null) {
                    return;
                }
                for (const ground of ["groupedList", "groupedRows"]) {
                    if (!seen.has(ground)) {
                        context.report({ data: { element: list.name.name, ground }, messageId: "missing", node: list });
                    }
                }
            },
        };
    },
    meta: {
        docs: {
            description: "A file rendering a SwiftUI `List` or `Form` must apply `groupedList()` and `groupedRows()`.",
        },
        messages: {
            missing:
                "This file renders <{{element}}> but never calls {{ground}}(); the screen keeps iOS's own grey ground.",
        },
        type: "problem",
    },
};

const BOTTOM_SHEET_MODULE = "@expo/ui/community/bottom-sheet";

// Only value imports count: a file that holds a `useRef<BottomSheetModal>` never presents one.
const bottomSheetBackground = {
    create(context) {
        let importNode = null;
        let painted = false;
        return {
            ImportDeclaration(node) {
                if (node.source.value !== BOTTOM_SHEET_MODULE || node.importKind === "type") {
                    return;
                }
                const presents = node.specifiers.some(
                    (specifier) =>
                        specifier.type === "ImportSpecifier" &&
                        specifier.importKind !== "type" &&
                        isIdentifier(specifier.imported, "BottomSheetModal")
                );
                if (presents) {
                    importNode = node;
                }
            },
            JSXAttribute(node) {
                if (isJsxName(node.name, ["backgroundStyle"])) {
                    painted = true;
                }
            },
            "Program:exit"() {
                if (importNode !== null && !painted) {
                    context.report({ messageId: "missing", node: importNode });
                }
            },
        };
    },
    meta: {
        docs: { description: "A file presenting a `BottomSheetModal` must pass it a `backgroundStyle`." },
        messages: {
            missing:
                "This file presents a BottomSheetModal but sets no `backgroundStyle`; the sheet keeps the system material.",
        },
        type: "problem",
    },
};

const SHEET_REPAINT = /\bbg-(?:background|surface|card|foreground\/\d+)\b/;

const noSheetRepaint = {
    create(context) {
        const check = (node, text) => {
            const match = SHEET_REPAINT.exec(text);
            if (match) {
                context.report({ data: { utility: match[0] }, messageId: "repaint", node });
            }
        };
        return {
            Literal(node) {
                // oxlint-disable-next-line anti-slop/no-runtime-typeof -- an ESTree Literal is the boundary: its value is a string, number, boolean, null or regex by node shape
                if (typeof node.value === "string") {
                    check(node, node.value);
                }
            },
            TemplateElement(node) {
                check(node, node.value.raw);
            },
        };
    },
    meta: {
        docs: { description: "Import-sheet content must not paint a solid background, wash, or card." },
        messages: {
            repaint:
                "`{{utility}}` re-paints the sheet's ground. The root's `backgroundStyle` owns it; content sits on that paper.",
        },
        type: "problem",
    },
};

const hasWidgetDirective = (fn) =>
    fn?.body?.type === "BlockStatement" && fn.body.body.some((statement) => statement.directive === "widget");

const DECLARATIONS = new Set(["VariableDeclaration", "FunctionDeclaration", "ClassDeclaration"]);
const unwrapExport = (statement) =>
    statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
        ? statement.declaration
        : statement;
const spanOf = (node) => node.range ?? [node.start, node.end];
const contains = (outer, inner) => {
    const [outerStart, outerEnd] = spanOf(outer);
    const [innerStart, innerEnd] = spanOf(inner);
    return outerStart <= innerStart && innerEnd <= outerEnd;
};

// A "widget" body is evaluated in the extension's bare JSContext, so a module-scope reference paints a
// ReferenceError on the tile that tsc, lint and the iOS build all miss. The top-level statement holding
// the first directive, standalone or inline in `createWidget(...)`, is the only exempt one.
const widgetModuleScope = {
    create(context) {
        const widgets = [];
        const collect = (node) => {
            if (hasWidgetDirective(node)) {
                widgets.push(node);
            }
        };
        return {
            ArrowFunctionExpression: collect,
            FunctionDeclaration: collect,
            FunctionExpression: collect,
            "Program:exit"(node) {
                const [first, ...rest] = widgets;
                if (first === undefined) {
                    return;
                }
                for (const second of rest) {
                    context.report({ messageId: "second", node: second });
                }
                for (const statement of node.body) {
                    const declaration = unwrapExport(statement);
                    if (declaration && DECLARATIONS.has(declaration.type) && !contains(statement, first)) {
                        context.report({ messageId: "leak", node: declaration });
                    }
                }
            },
        };
    },
    meta: {
        docs: { description: 'A file with a `"widget"` component declares nothing else at module scope.' },
        messages: {
            leak: "Module-scope declarations are out of reach of the widget's JSContext. Move it inside the widget body or pass it as a prop.",
            second: 'One widget per file: this second "widget" body is module scope to the first one and unreachable from its JSContext.',
        },
        type: "problem",
    },
};

// `canSave` already folds in `!isSubmitting`, so a call site that forgets `busy` dims its save but never spins.
const editorCtaBusy = {
    create(context) {
        return {
            JSXOpeningElement(node) {
                if (!isJsxName(node.name, ["EditorCta"])) {
                    return;
                }
                const busy = node.attributes.some((a) => a.type === "JSXAttribute" && isJsxName(a.name, ["busy"]));
                if (!busy) {
                    context.report({ messageId: "missing", node });
                }
            },
        };
    },
    meta: {
        docs: { description: "Every `<EditorCta>` passes `busy`, so the save has a visible spinner." },
        messages: {
            missing: "<EditorCta> without `busy`: the save dims but never spins. Pass the form's submitting state.",
        },
        type: "problem",
    },
};

const TEST_CALLS = new Set(["describe", "it", "suite", "test"]);
const HOOKS = new Set(["afterAll", "afterEach", "beforeAll", "beforeEach"]);
const TEST_OPTIONS = new Set(["repeats", "retry", "timeout"]);
const CONFIG_OPTIONS = new Set(["hookTimeout", "retry", "testTimeout"]);

const chainRoot = (node) => {
    switch (node?.type) {
        case "Identifier": {
            return node.name;
        }
        case "MemberExpression": {
            return chainRoot(node.object);
        }
        case "CallExpression": {
            return chainRoot(node.callee);
        }
        case "TaggedTemplateExpression": {
            return chainRoot(node.tag);
        }
        default: {
            return null;
        }
    }
};

const hasOption = (node, names) =>
    node?.type === "ObjectExpression" &&
    node.properties.some(
        (property) => property.type === "Property" && names.has(property.key.name ?? property.key.value)
    );

const isFunction = (node) => node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";

const isMethodCall = (callee, object, method) =>
    callee.type === "MemberExpression" && isIdentifier(callee.object, object) && isIdentifier(callee.property, method);

const noTestTimeoutOrRetry = {
    create(context) {
        return {
            CallExpression(node) {
                const { arguments: args, callee } = node;
                const overridden =
                    isMethodCall(callee, "jest", "setTimeout") ||
                    isMethodCall(callee, "jest", "retryTimes") ||
                    (isMethodCall(callee, "vi", "setConfig") && hasOption(args[0], CONFIG_OPTIONS)) ||
                    (callee.type === "Identifier" && HOOKS.has(callee.name) && args.length > 1) ||
                    (TEST_CALLS.has(chainRoot(callee)) &&
                        ((args.length > 2 && !isFunction(args[2])) || hasOption(args[1], TEST_OPTIONS)));
                if (overridden) {
                    context.report({ messageId: "override", node });
                }
            },
        };
    },
    meta: {
        docs: { description: "Disallow per-test timeouts and retries; the runner's default timeout is the ceiling." },
        messages: {
            override:
                "A per-test timeout or retry hides a wait that should be awaited. Remove it and await what the test is waiting for; only `*.live.test.ts` model probes may take longer.",
        },
        type: "problem",
    },
};

const MAX_COMMENT_LINES = 3;
const MAX_COMMENT_WIDTH = 120;
const DIRECTIVE = /^\s*(?:(?:oxlint|eslint)-|@ts-|prettier-ignore|#(?:end)?region|@jsx|@refresh|global\s)/u;
const URL = /https?:\/\//u;

const contentLines = (comment) =>
    comment.value
        .split("\n")
        .map((line) => line.replace(/^\s*\*?\s?/u, "").trim())
        .filter((line) => line !== "");

const noSlopComments = {
    create(context) {
        const { sourceCode } = context;
        const groups = [];
        for (const comment of sourceCode.getAllComments()) {
            const previous = groups.at(-1)?.at(-1);
            const continues =
                comment.type === "Line" &&
                previous?.type === "Line" &&
                previous.loc.end.line === comment.loc.start.line - 1 &&
                previous.loc.start.column === comment.loc.start.column;
            if (continues) {
                groups.at(-1).push(comment);
            } else {
                groups.push([comment]);
            }
        }

        const report = (comments, messageId) =>
            context.report({ loc: { end: comments.at(-1).loc.end, start: comments[0].loc.start }, messageId });

        return {
            Program() {
                for (const comments of groups) {
                    const lines = comments.flatMap(contentLines);
                    if (comments.some((comment) => comment.value.includes("—"))) {
                        report(comments, "dash");
                    }
                    if (lines.length === 0 || DIRECTIVE.test(comments[0].value)) {
                        continue;
                    }
                    if (lines.length > MAX_COMMENT_LINES) {
                        report(comments, "long");
                    }
                    const { end, start } = { end: comments.at(-1).loc.end.line, start: comments[0].loc.start.line };
                    const wide = sourceCode.lines
                        .slice(start - 1, end)
                        .some((line) => line.length > MAX_COMMENT_WIDTH && !URL.test(line));
                    if (wide) {
                        report(comments, "wide");
                    }
                }
            },
        };
    },
    meta: {
        docs: { description: "Comments are three lines of 120 columns at most, with no em dashes." },
        messages: {
            dash: "No em dashes in comments. Use a colon, a comma, a period or parentheses.",
            long: "Comments get three lines at most. Keep the one thing the code can't show; longer reasoning belongs in the commit message or docs/internals.",
            wide: "Wrap the comment at 120 columns, so three lines stay three lines.",
        },
        type: "suggestion",
    },
};

export default {
    meta: { name: "outlayr" },
    rules: {
        "bottom-sheet-background": bottomSheetBackground,
        "editor-cta-busy": editorCtaBusy,
        "no-drizzle-transaction": noDrizzleTransaction,
        "no-low-value-comments": noLowValueComments,
        "no-sheet-repaint": noSheetRepaint,
        "no-slop-comments": noSlopComments,
        "no-test-timeout-or-retry": noTestTimeoutOrRetry,
        "swiftui-list-grounds": swiftuiListGrounds,
        "widget-module-scope": widgetModuleScope,
    },
};
