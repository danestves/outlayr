// Each set empties its output directory first, so a renamed slug leaves no orphan SVG.
// `gen:icons <dir>` redoes one set and leaves the rest alone.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { loadIcon, resetDirectory, toSvg } from "./hugeicon-raster";
import { SETS } from "./icon-sets";
import type { IconSet } from "./icon-sets";

const appDir = resolve(dirname(process.argv[1]), "..");

async function writeSet(set: IconSet): Promise<number> {
    const outDir = join(appDir, "assets", set.dir);
    resetDirectory(outDir);

    let written = 0;
    for (const entry of set.entries) {
        const weight = entry.weight ?? "stroke";

        const strokeWidth = weight === "solid" ? undefined : (entry.stroke ?? set.stroke);

        const base = join(outDir, entry.slug);
        // oxlint-disable-next-line no-await-in-loop -- each entry prints its progress line under its own set header
        writeFileSync(`${base}.svg`, toSvg(await loadIcon(weight, entry.icon), strokeWidth, entry.ink));
        written += 1;

        if (entry.withSelected) {
            writeFileSync(`${base}-selected.svg`, toSvg(await loadIcon("solid", entry.icon)));
            written += 1;
        }

        console.log(`  ${entry.slug} ← ${entry.icon} (${weight}${entry.withSelected ? " + solid" : ""})`);
    }

    return written;
}

async function main() {
    const [only] = process.argv.slice(2);
    const sets = only ? SETS.filter((set) => set.dir === only) : SETS;

    if (sets.length === 0) {
        throw new Error(`no icon set named "${only}" — known sets: ${SETS.map((set) => set.dir).join(", ")}`);
    }

    let total = 0;
    for (const set of sets) {
        console.log(`\n${set.dir}`);
        // oxlint-disable-next-line no-await-in-loop -- writeSet empties its output directory first, so concurrent sets would interleave their progress lines under the wrong header
        total += await writeSet(set);
    }

    console.log(`\nWrote ${total} SVGs across ${sets.length} set${sets.length === 1 ? "" : "s"}`);
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
