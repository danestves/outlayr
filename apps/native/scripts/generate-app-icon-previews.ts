// A `.icon` bundle has no runtime form JS can draw, so the App Icon picker shows these committed PNGs instead.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { rasterize, requireRsvgConvert, resetDirectory } from "./hugeicon-raster";

const TILE_SIZE = 44;

const scriptDir = dirname(new URL(import.meta.url).pathname);
const sourceDir = resolve(scriptDir, "../assets/app-icon-previews");
const outputDir = resolve(scriptDir, "../assets/images/app-icon-previews");

requireRsvgConvert();
resetDirectory(outputDir);

const sources = readdirSync(sourceDir)
    .filter((file) => file.endsWith(".svg"))
    .sort();

for (const file of sources) {
    const slug = file.replace(/\.svg$/, "");
    rasterize(readFileSync(join(sourceDir, file), "utf-8"), join(outputDir, slug), TILE_SIZE);
}

console.log(`Wrote ${sources.length} app icon previews to ${outputDir}`);
