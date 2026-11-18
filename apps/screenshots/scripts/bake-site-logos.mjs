import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const NATIVE_SRC = new URL("../../native/src/", import.meta.url);
const COLORS_FILE = new URL("../../site/src/components/app-ui/logos.json", import.meta.url);
const TILES_DIR = new URL("../../site/public/media/logos/", import.meta.url);

const PLATE_SAMPLE = 128;
const STORED_SIDE = 512;
const TILE_SIDE = 192;
const GLOW_SIDE = 24;
const GLOW_BUCKETS = 12;
const GLOW_FLOOR = 0.15;

registerHooks({
    resolve(specifier, context, nextResolve) {
        const resolved = nextResolve(
            specifier.startsWith("@/") ? new URL(`${specifier.slice(2)}.ts`, NATIVE_SRC).href : specifier,
            context
        );
        return resolved.url.startsWith(NATIVE_SRC.href) ? { ...resolved, format: "module-typescript" } : resolved;
    },
});
const { logoPlate } = await import(new URL("domain/logo-plate.ts", NATIVE_SRC).href);

async function fetchLogo(domain) {
    const response = await fetch(`https://logos.tryoutlayr.com/merchants/${encodeURIComponent(domain)}`);
    if (!response.ok) {
        throw new Error(`The logo Worker answered ${response.status} for ${domain}`);
    }
    return Buffer.from(await response.arrayBuffer());
}

async function samplePixels(bytes, width, height) {
    const scale = PLATE_SAMPLE / Math.max(width, height);
    const size = { height: Math.max(1, Math.round(height * scale)), width: Math.max(1, Math.round(width * scale)) };
    const data = await sharp(bytes)
        .ensureAlpha()
        .resize({ ...size, fit: "fill", kernel: "linear" })
        .raw()
        .toBuffer();
    return { ...size, data: new Uint8Array(data) };
}

async function storedImage(bytes) {
    const { height, width } = await sharp(bytes).metadata();
    const plan = logoPlate(await samplePixels(bytes, width, height));
    if (plan.kind === "keep") {
        return sharp(bytes)
            .flatten({ background: "#000000" })
            .resize({ fit: "inside", height: STORED_SIDE, width: STORED_SIDE, withoutEnlargement: true })
            .png()
            .toBuffer();
    }

    const { color, source, target } = plan;
    const side = Math.min(STORED_SIDE, Math.max(width, height));
    const left = Math.min(width - 1, Math.round(source.x * width));
    const top = Math.min(height - 1, Math.round(source.y * height));
    const mark = await sharp(bytes)
        .ensureAlpha()
        .extract({
            height: Math.max(1, Math.min(height - top, Math.round(source.height * height))),
            left,
            top,
            width: Math.max(1, Math.min(width - left, Math.round(source.width * width))),
        })
        .resize({
            fit: "fill",
            height: Math.max(1, Math.round(target.height * side)),
            kernel: "linear",
            width: Math.max(1, Math.round(target.width * side)),
        })
        .png()
        .toBuffer();
    return sharp({ create: { background: color, channels: 3, height: side, width: side } })
        .composite([{ input: mark, left: Math.round(target.x * side), top: Math.round(target.y * side) }])
        .png()
        .toBuffer();
}

async function glowColor(stored) {
    const data = await sharp(stored)
        .removeAlpha()
        .resize({ fit: "fill", height: GLOW_SIDE, width: GLOW_SIDE })
        .raw()
        .toBuffer();
    const weight = Array.from({ length: GLOW_BUCKETS }, () => 0);
    const sum = Array.from({ length: GLOW_BUCKETS }, () => [0, 0, 0]);
    for (let index = 0; index < data.length; index += 3) {
        const rgb = [data[index] / 255, data[index + 1] / 255, data[index + 2] / 255];
        const [r, g, b] = rgb;
        const hi = Math.max(r, g, b);
        const lo = Math.min(r, g, b);
        const saturation = hi === 0 ? 0 : (hi - lo) / hi;
        if (saturation > GLOW_FLOOR && hi > GLOW_FLOOR) {
            const delta = hi - lo;
            let sector = (r - g) / delta + 4;
            if (hi === r) {
                sector = ((g - b) / delta) % 6;
            } else if (hi === g) {
                sector = (b - r) / delta + 2;
            }
            const hue = (sector / 6 + 1) % 1;
            const bucket = Math.min(Math.floor(hue * GLOW_BUCKETS), GLOW_BUCKETS - 1);
            weight[bucket] += saturation;
            sum[bucket] = sum[bucket].map((value, channel) => value + rgb[channel] * saturation);
        }
    }
    const top = weight.indexOf(Math.max(...weight));
    if (weight[top] === 0) {
        return null;
    }
    const hex = sum[top].map((value) =>
        Math.round((value / weight[top]) * 255)
            .toString(16)
            .padStart(2, "0")
    );
    return `#${hex.join("")}`.toUpperCase();
}

async function bake(domain) {
    const stored = await storedImage(await fetchLogo(domain));
    const { height, width } = await sharp(stored).metadata();
    const side = Math.min(TILE_SIDE, width, height);
    await sharp(stored)
        .resize({ fit: "cover", height: side, width: side })
        .webp({ quality: 90 })
        .toFile(fileURLToPath(new URL(`${domain}.webp`, TILES_DIR)));
    return [domain, await glowColor(stored)];
}

const baked = JSON.parse(readFileSync(COLORS_FILE, "utf-8"));
const domains = [...new Set([...Object.keys(baked), ...process.argv.slice(2)])].toSorted();
mkdirSync(TILES_DIR, { recursive: true });
const colors = Object.fromEntries(await Promise.all(domains.map(bake)));
writeFileSync(COLORS_FILE, `${JSON.stringify(colors, null, 4)}\n`);
process.stdout.write(`${domains.length} logos baked\n`);
