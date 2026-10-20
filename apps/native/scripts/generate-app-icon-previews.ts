/**
 * Rasterizes the App Icon picker's thumbnails. Run after changing an SVG in
 * `assets/app-icon-previews/` and commit the PNGs:
 * `vp run --filter @outlayr/native gen:app-icon-previews`. Needs
 * `brew install librsvg`.
 *
 * A `.icon` bundle is compiled by `actool` at build time and has no runtime
 * representation JS can draw, so a picker row cannot show the real icon — these
 * flat previews stand in for it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { rasterize, requireRsvgConvert, resetDirectory } from "./hugeicon-raster";

/** Points. Matches the 44pt tile Swift's `SettingsAppIconView` drew. */
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
