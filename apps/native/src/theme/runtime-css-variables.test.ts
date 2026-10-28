import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vite-plus/test";

const nativeRoot = join(import.meta.dirname, "../..");
const stylesheet = readFileSync(join(nativeRoot, "global.css"), "utf-8");
const panelui = readFileSync(join(nativeRoot, "node_modules/panelui-native/theme.css"), "utf-8");

const NAME = /"(--[a-z][a-z0-9-]*)"/g;

function declares(css: string, name: string): number {
    const pattern = new RegExp(`^\\s*${name}:\\s*(?!var\\()`, "gm");
    return css.match(pattern)?.length ?? 0;
}

function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
            return sourceFiles(path);
        }
        return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [path] : [];
    });
}

function runtimeReads(): { file: string; name: string }[] {
    const seen = new Map<string, { file: string; name: string }>();
    for (const file of sourceFiles(join(nativeRoot, "src"))) {
        for (const match of readFileSync(file, "utf-8").matchAll(NAME)) {
            const read = { file: relative(nativeRoot, file), name: match[1] };
            seen.set(`${read.file} ${read.name}`, read);
        }
    }
    return [...seen.values()];
}

describe("variables read at runtime", () => {
    const reads = runtimeReads();

    it("finds the reads it is meant to guard", () => {
        expect(reads.length).toBeGreaterThan(20);
    });

    it.each(reads)("$name in $file resolves to this app's palette", ({ name }) => {
        if (declares(panelui, name) === 0) {
            return;
        }
        expect({ name, ours: declares(stylesheet, name) }).toStrictEqual({ name, ours: 2 });
    });
});
