import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

export type SvgElement = [string, Record<string, string>];

export type IconWeight = "stroke" | "solid";

const VIEWBOX = 24;

const SCALES = [1, 2, 3];

// A templated bitmap ships only its alpha. A consumer that draws the pixels as they are (SwiftUI's
// `Image.uiImage`) needs the colour baked in through `ink`.
const INK = "#000000";

function attributeName(key: string): string {
    return key.replaceAll(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function escapeAttribute(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

// `strokeWidth` overrides the 1.5 the package bakes into every stroke glyph; the solid weight is filled instead.
export function toSvg(elements: SvgElement[], strokeWidth?: number, ink: string = INK): string {
    const markup = elements
        .map(([tag, attributes]) => {
            const serialized = Object.entries(attributes)
                .filter(([key]) => key !== "key")
                .map(([key, value]) => {
                    const resolved =
                        key === "strokeWidth" && strokeWidth !== undefined
                            ? String(strokeWidth)
                            : value.replace("currentColor", ink);
                    return `${attributeName(key)}="${escapeAttribute(resolved)}"`;
                })
                .join(" ");
            return `<${tag} ${serialized} />`;
        })
        .join("");

    // Without `fill="none"` the stroke weight rasterizes as a solid blob.
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" fill="none">${markup}</svg>`;
}

export function rasterize(svg: string, basePath: string, points: number) {
    for (const scale of SCALES) {
        const pixels = String(points * scale);
        const suffix = scale === 1 ? "" : `@${scale}x`;
        execFileSync("rsvg-convert", ["-w", pixels, "-h", pixels, "-o", `${basePath}${suffix}.png`], { input: svg });
    }
}

export async function loadIcon(weight: IconWeight, name: string): Promise<SvgElement[]> {
    const module = await import(`@hugeicons-pro/core-${weight}-rounded/${name}`);
    const elements = module.default as SvgElement[] | undefined;
    if (!Array.isArray(elements)) {
        throw new TypeError(`@hugeicons-pro/core-${weight}-rounded/${name} has no icon data`);
    }
    return elements;
}

export function requireRsvgConvert() {
    try {
        execFileSync("rsvg-convert", ["--version"], { stdio: "ignore" });
    } catch (error) {
        throw new Error("rsvg-convert not found on PATH — install it with `brew install librsvg`", { cause: error });
    }
}

export function resetDirectory(directory: string) {
    rmSync(directory, { force: true, recursive: true });
    mkdirSync(directory, { recursive: true });
}
