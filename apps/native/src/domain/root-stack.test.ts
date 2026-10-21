import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "@jest/globals";
import {
    createSourceFile,
    forEachChild,
    isBinaryExpression,
    isCallExpression,
    isIdentifier,
    isJsxAttribute,
    isJsxElement,
    isJsxExpression,
    isJsxSelfClosingElement,
    isPropertyAccessExpression,
    isStringLiteral,
    ScriptKind,
    ScriptTarget,
    SyntaxKind,
} from "typescript";
import type {
    JsxAttribute,
    JsxElement,
    JsxOpeningLikeElement,
    JsxSelfClosingElement,
    Node,
    SourceFile,
} from "typescript";

import type { RootStackGroup } from "@/domain/auth-gate";

import { MODAL_SCREENS, ROOT_STACK_SCREEN_NAMES, SHEET_SCREENS, TITLED_SCREENS } from "./root-stack";

const GROUPS: readonly RootStackGroup[] = ["onboarding", "sign-in", "adopt", "ledger"];

const APP_DIR = join(import.meta.dirname, "..", "app");
const LAYOUT_PATH = join(APP_DIR, "_layout.tsx");

// expo-router registers every `.[tj]sx?` under `app/` except `+api`, `+html`, `+middleware` and `+native-intent`, so a
// test file there becomes a real route and ships. Route tests belong beside their screen under `src/screens/`.
const ROUTE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const LAYOUT_BASENAME = "_layout";
const IGNORED_ROUTE_BASENAMES = new Set(["+api", "+html", "+middleware", "+native-intent"]);
// expo-router folds `index.android.tsx` into its plain sibling's route (`getRoutesCore`), so it adds none of its own.
const PLATFORM_SUFFIX = /\.(android|ios|native|web)$/;

const UNGUARDED_CATCH_ALL = "+not-found";

function byCodeUnit(a: string, b: string): number {
    if (a === b) {
        return 0;
    }
    return a < b ? -1 : 1;
}

function routeBasename(fileName: string): string | null {
    const extension = ROUTE_EXTENSIONS.find((candidate) => fileName.endsWith(candidate));
    if (extension === undefined) {
        return null;
    }
    const base = fileName.slice(0, -extension.length);
    if (base === LAYOUT_BASENAME || IGNORED_ROUTE_BASENAMES.has(base) || PLATFORM_SUFFIX.test(base)) {
        return null;
    }
    return base;
}

function hasOwnLayout(dir: string): boolean {
    return ROUTE_EXTENSIONS.some((extension) => existsSync(join(dir, `${LAYOUT_BASENAME}${extension}`)));
}

function collectRouteNames(dir: string, prefix: string): string[] {
    const names: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            const nested = prefix ? `${prefix}/${entry.name}` : entry.name;
            const nestedDir = join(dir, entry.name);
            names.push(...(hasOwnLayout(nestedDir) ? [nested] : collectRouteNames(nestedDir, nested)));
            continue;
        }
        const base = routeBasename(entry.name);
        if (base === null) {
            continue;
        }
        names.push(prefix ? `${prefix}/${base}` : base);
    }
    return names;
}

const ROUTE_FILES_ON_DISK = collectRouteNames(APP_DIR, "");
const PARTITIONABLE_ROUTES = ROUTE_FILES_ON_DISK.filter((name) => name !== UNGUARDED_CATCH_ALL);

describe("root stack total-partition invariant", () => {
    const groups = GROUPS.map((group) => ROOT_STACK_SCREEN_NAMES[group]);

    it("covers every route file under app/ exactly once", () => {
        const union = groups.flat();
        const declared = new Set(union);
        const unpartitioned = PARTITIONABLE_ROUTES.filter((name) => !declared.has(name));
        const phantom = union.filter((name) => !PARTITIONABLE_ROUTES.includes(name));
        expect({ phantom, unpartitioned }).toStrictEqual({
            phantom: [],
            unpartitioned: [],
        });
        expect(union).toHaveLength(PARTITIONABLE_ROUTES.length);
    });
});

interface RenderedScreen {
    group: RootStackGroup | null;
    line: number;
    name: string;
}

type NamedList = readonly { name: string }[];

const DYNAMIC_SCREEN_LISTS: Record<string, NamedList> = {
    MODAL_SCREENS,
    SHEET_SCREENS,
    TITLED_SCREENS,
};

type JsxTag = JsxElement | JsxSelfClosingElement;

function openingOf(node: JsxTag): JsxOpeningLikeElement {
    return isJsxElement(node) ? node.openingElement : node;
}

function jsxTagName(node: JsxTag): string {
    return openingOf(node).tagName.getText();
}

function jsxAttribute(node: JsxTag, attribute: string): JsxAttribute | null {
    const found = openingOf(node).attributes.properties.find(
        (property): property is JsxAttribute => isJsxAttribute(property) && property.name.getText() === attribute
    );
    return found ?? null;
}

function lineOf(node: Node, source: SourceFile): number {
    return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function guardedGroup(node: JsxTag, source: SourceFile): RootStackGroup {
    const initializer = jsxAttribute(node, "guard")?.initializer;
    const expression = initializer && isJsxExpression(initializer) ? initializer.expression : undefined;
    if (
        expression === undefined ||
        !isBinaryExpression(expression) ||
        expression.operatorToken.kind !== SyntaxKind.EqualsEqualsEqualsToken ||
        !isIdentifier(expression.left) ||
        expression.left.text !== "group" ||
        !isStringLiteral(expression.right)
    ) {
        throw new Error(
            `app/_layout.tsx:${lineOf(node, source)} <Stack.Protected> does not carry a \`guard={group === "<name>"}\` prop. This test only understands that shape — restore it, or teach the test the new one before landing the change.`
        );
    }
    const group = expression.right.text;
    if (!GROUPS.includes(group as RootStackGroup)) {
        throw new Error(
            `app/_layout.tsx:${lineOf(node, source)} <Stack.Protected> guards on "${group}", which is not a root stack group (${GROUPS.join(", ")}). Add it to ROOT_STACK_SCREEN_NAMES and to GROUPS here.`
        );
    }
    return group as RootStackGroup;
}

function mappedList(node: Node): NamedList | null {
    if (
        !(isCallExpression(node) && isPropertyAccessExpression(node.expression)) ||
        node.expression.name.text !== "map" ||
        !isIdentifier(node.expression.expression)
    ) {
        return null;
    }
    return DYNAMIC_SCREEN_LISTS[node.expression.expression.text] ?? null;
}

function renderedNames(
    node: JsxTag,
    source: SourceFile,
    group: RootStackGroup | null,
    list: NamedList | null
): RenderedScreen[] {
    const line = lineOf(node, source);
    const initializer = jsxAttribute(node, "name")?.initializer;
    if (initializer && isStringLiteral(initializer)) {
        return [{ group, line, name: initializer.text }];
    }
    if (
        initializer &&
        isJsxExpression(initializer) &&
        initializer.expression &&
        isPropertyAccessExpression(initializer.expression)
    ) {
        if (list === null) {
            throw new Error(
                `app/_layout.tsx:${line} <Stack.Screen name={…}> is computed outside any known screen list (${Object.keys(DYNAMIC_SCREEN_LISTS).join(", ")}). Move the names into one of those exported lists, or teach this test how to expand the new one.`
            );
        }
        return list.map((entry) => ({ group, line, name: entry.name }));
    }
    throw new Error(
        `app/_layout.tsx:${line} <Stack.Screen> has no \`name\` this test can read. Give it a string literal, or render it from one of the exported screen lists (${Object.keys(DYNAMIC_SCREEN_LISTS).join(", ")}).`
    );
}

function parseLayoutScreens(layoutSource: string): RenderedScreen[] {
    const source = createSourceFile("_layout.tsx", layoutSource, ScriptTarget.Latest, true, ScriptKind.TSX);
    const screens: RenderedScreen[] = [];

    const visit = (node: Node, group: RootStackGroup | null, list: NamedList | null) => {
        const mapped = mappedList(node);
        if (mapped !== null && isCallExpression(node)) {
            for (const argument of node.arguments) {
                visit(argument, group, mapped);
            }
            return;
        }
        if (isJsxElement(node) || isJsxSelfClosingElement(node)) {
            const tag = jsxTagName(node);
            if (tag === "Stack.Protected") {
                const nested = guardedGroup(node, source);
                forEachChild(node, (child) => visit(child, nested, list));
                return;
            }
            if (tag === "Stack.Screen") {
                screens.push(...renderedNames(node, source, group, list));
            }
        }
        forEachChild(node, (child) => visit(child, group, list));
    };

    visit(source, null, null);
    return screens;
}

describe("guard partition written in app/_layout.tsx", () => {
    const rendered = parseLayoutScreens(readFileSync(LAYOUT_PATH, "utf-8"));

    it("renders no Stack.Screen outside every Stack.Protected block", () => {
        const stranded = rendered
            .filter((screen) => screen.group === null)
            .map(
                (screen) =>
                    `app/_layout.tsx:${screen.line} "${screen.name}" sits outside every <Stack.Protected> block, so no failed guard ever redirects away from it and it stays up across every mode change, signed out included. Move it inside the block for its group and list it in ROOT_STACK_SCREEN_NAMES.`
            );
        expect(stranded).toStrictEqual([]);
    });

    it("renders exactly the name-to-group partition declared in root-stack.ts", () => {
        const declaredGroupOf = new Map(
            GROUPS.flatMap((group) =>
                ROOT_STACK_SCREEN_NAMES[group].map((name) => [name, group] as [string, RootStackGroup])
            )
        );
        const drift = rendered
            .filter((screen) => screen.group !== null && declaredGroupOf.get(screen.name) !== screen.group)
            .map(
                (screen) =>
                    `app/_layout.tsx:${screen.line} "${screen.name}" is rendered under the "${screen.group}" guard but ROOT_STACK_SCREEN_NAMES puts it under "${declaredGroupOf.get(screen.name) ?? "no group"}". Make the two agree — the invariant test above trusts the constant, the router obeys the JSX.`
            );
        expect(drift).toStrictEqual([]);

        const renderedByGroup = Object.fromEntries(
            GROUPS.map((group) => [
                group,
                rendered
                    .filter((screen) => screen.group === group)
                    .map((screen) => screen.name)
                    .sort(byCodeUnit),
            ])
        );
        const declaredByGroup = Object.fromEntries(
            GROUPS.map((group) => [group, [...ROOT_STACK_SCREEN_NAMES[group]].sort(byCodeUnit)])
        );
        expect(renderedByGroup).toStrictEqual(declaredByGroup);
    });
});
