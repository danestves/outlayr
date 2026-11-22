import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { ROOT_STACK, SUGGEST_SCREEN } from "./root-stack";

const APP_DIR = join(import.meta.dirname, "..", "app");

// expo-router registers every `.[tj]sx?` under `app/` except `+api`, `+html`, `+middleware` and `+native-intent`, so a
// test file there becomes a real route and ships. Route tests belong beside their screen under `src/screens/`.
const ROUTE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const LAYOUT_BASENAME = "_layout";
const IGNORED_ROUTE_BASENAMES = new Set(["+api", "+html", "+middleware", "+native-intent"]);
// expo-router folds `index.android.tsx` into its plain sibling's route (`getRoutesCore`), so it adds none of its own.
const PLATFORM_SUFFIX = /\.(android|ios|native|web)$/;

const UNGUARDED_CATCH_ALL = "+not-found";

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
    it("covers every route file under app/ exactly once", () => {
        const union = [...ROOT_STACK.flatMap((block) => block.screens.map((screen) => screen.name)), SUGGEST_SCREEN];
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
