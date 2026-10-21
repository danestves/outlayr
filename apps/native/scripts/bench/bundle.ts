// Attributes every byte of the iOS JS bundle to its package: `vp run bench:bundle [--out f.json | --baseline f.json]`.
// Plain JS, not Hermes bytecode: a `.hbc.map` cannot be attributed column by column.
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";

import { decodedMappings, FlattenMap } from "@jridgewell/trace-mapping";
import type { TraceMap } from "@jridgewell/trace-mapping";

import { readIosBundle } from "../export-ios-bundle";

const TOP = 25;
const KB = 1024;
const DELTA_FLOOR = 16 * KB;

interface Report {
    byOwner: Record<string, number>;
    gzipBytes: number;
    totalBytes: number;
}

const { values: args } = parseArgs({
    options: {
        baseline: { type: "string" },
        out: { type: "string" },
    },
});

// The last `node_modules` segment wins, so pnpm's `.pnpm/<name>@<ver>/node_modules/<name>` resolves to `<name>`.
function ownerOf(source: string): string {
    const packaged = /node_modules\/(@[^/]+\/[^/]+|[^/]+)(?!.*node_modules)/.exec(source);
    if (packaged) {
        return packaged[1];
    }
    const workspace = /(?:^|\/)(packages\/[^/]+)\//.exec(source);
    if (workspace) {
        return workspace[1];
    }
    const local = source.split("apps/native/")[1] ?? source;
    return local.split("/").slice(0, 2).join("/");
}

// Source-map columns count UTF-16 code units and the bundle carries non-ASCII strings, so each column is converted
// to a byte offset before the subtraction.
function attribute(bundle: string, map: TraceMap): Record<string, number> {
    const lines = bundle.split("\n");
    const sizes: Record<string, number> = {};
    const add = (owner: string, bytes: number) => {
        sizes[owner] = (sizes[owner] ?? 0) + bytes;
    };
    const sources = map.resolvedSources;
    const mapped = decodedMappings(map);
    for (const [lineIndex, segments] of mapped.entries()) {
        const line = lines[lineIndex] ?? "";
        // +1 for the newline the split removed.
        const lineBytes = Buffer.byteLength(line) + 1;
        if (segments.length === 0) {
            add("[unmapped]", lineBytes);
            continue;
        }
        const ascii = lineBytes === line.length + 1;
        let previousColumn = 0;
        let previousByte = 0;
        const byteOffset = (column: number) => {
            if (!ascii) {
                previousByte += Buffer.byteLength(line.slice(previousColumn, column));
                previousColumn = column;
                return previousByte;
            }
            return column;
        };
        const starts = segments.map((segment) => byteOffset(segment[0]));
        add("[unmapped]", starts[0] ?? 0);
        for (const [index, segment] of segments.entries()) {
            const end = starts[index + 1] ?? lineBytes;
            const [, sourceIndex] = segment;
            const owner = sourceIndex === undefined ? "[no source]" : ownerOf(sources[sourceIndex] ?? "");
            add(owner, end - (starts[index] ?? 0));
        }
    }
    return sizes;
}

function exportBundle(): Report {
    return readIosBundle((bundle, map) => ({
        byOwner: attribute(bundle, new FlattenMap(map)),
        gzipBytes: gzipSync(bundle).length,
        totalBytes: Buffer.byteLength(bundle),
    }));
}

const kb = (bytes: number) => `${(bytes / KB).toFixed(0).padStart(7)} KB`;
const signedKb = (bytes: number) => `${bytes >= 0 ? "+" : "-"}${(Math.abs(bytes) / KB).toFixed(0)} KB`;

function print(report: Report, baseline: Report | null): void {
    const delta = (current: number, previous: number | undefined) =>
        baseline === null ? "" : `  ${signedKb(current - (previous ?? 0))}`;
    console.log(`bundle ${kb(report.totalBytes)}${delta(report.totalBytes, baseline?.totalBytes)}`);
    console.log(`gzip   ${kb(report.gzipBytes)}${delta(report.gzipBytes, baseline?.gzipBytes)}`);
    console.log("");
    const owners = Object.entries(report.byOwner).sort(([, a], [, b]) => b - a);
    const moved = (owner: string, bytes: number) =>
        baseline !== null && Math.abs(bytes - (baseline.byOwner[owner] ?? 0)) >= DELTA_FLOOR;
    for (const [rank, [owner, bytes]] of owners.entries()) {
        if (rank >= TOP && !moved(owner, bytes)) {
            continue;
        }
        const share = ((bytes * 100) / report.totalBytes).toFixed(1).padStart(5);
        console.log(`${kb(bytes)}  ${share}%  ${owner}${delta(bytes, baseline?.byOwner[owner])}`);
    }
    if (baseline !== null) {
        const gone = Object.keys(baseline.byOwner).filter((owner) => !(owner in report.byOwner));
        for (const owner of gone) {
            console.log(`${kb(0)}         ${owner}  ${signedKb(-baseline.byOwner[owner])}`);
        }
    }
}

const report = exportBundle();
// SAFETY: the baseline is this script's own `--out` file; nothing else writes it.
const baseline = args.baseline ? (JSON.parse(readFileSync(args.baseline, "utf-8")) as Report) : null;
print(report, baseline);
if (args.out) {
    writeFileSync(args.out, JSON.stringify(report, null, 2));
}
