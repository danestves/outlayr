import { strFromU8, unzipSync } from "fflate";

import { formatCsvRow, parseCsv } from "./csv";
import { HARD_PARSE_REJECT_CHARS } from "./import-diagnosis";

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const ALL_ROWS_SUFFIX = "_all.csv";
const CSV_EXTENSION = /\.csv$/i;
const MAX_NESTED_ZIP_BYTES = 512 * 1024 * 1024;

export function isZip(bytes: Uint8Array): boolean {
    return ZIP_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function csvEntries(
    bytes: Uint8Array,
    nested: boolean,
    budget: { csvBytes: number; nestedZipBytes: number }
): { name: string; text: string }[] {
    const entries = unzipSync(bytes, {
        filter: ({ name, originalSize }) => {
            if (name.startsWith("__MACOSX/")) {
                return false;
            }
            if (CSV_EXTENSION.test(name)) {
                budget.csvBytes -= originalSize;
                if (budget.csvBytes < 0) {
                    throw new RangeError("The archive holds more CSV text than an import reads");
                }
                return true;
            }
            if (!nested && name.toLowerCase().endsWith(".zip")) {
                budget.nestedZipBytes -= originalSize;
                if (budget.nestedZipBytes < 0) {
                    throw new RangeError("The nested archives are too large to open");
                }
                return true;
            }
            return false;
        },
    });
    return Object.entries(entries).flatMap(([name, content]) =>
        CSV_EXTENSION.test(name) ? [{ name, text: strFromU8(content) }] : csvEntries(content, true, budget)
    );
}

export function csvFromArchive(bytes: Uint8Array): string | null {
    let files: { name: string; text: string }[];
    try {
        files = csvEntries(bytes, false, { csvBytes: HARD_PARSE_REJECT_CHARS, nestedZipBytes: MAX_NESTED_ZIP_BYTES });
    } catch (error) {
        if (error instanceof RangeError) {
            throw error;
        }
        return null;
    }

    const names = new Set(files.map(({ name }) => name.toLowerCase()));
    const groups = new Map<string, string[][]>();
    for (const file of files) {
        const name = file.name.toLowerCase();
        if (!name.endsWith(ALL_ROWS_SUFFIX) && names.has(name.replace(CSV_EXTENSION, ALL_ROWS_SUFFIX))) {
            continue;
        }
        const [header, ...rows] = parseCsv(file.text);
        if (header == null) {
            continue;
        }
        const key = formatCsvRow(header);
        const group = groups.get(key) ?? [];
        group.push(...rows);
        groups.set(key, group);
    }

    let best: [string, string[][]] | null = null;
    for (const group of groups) {
        if (best == null || group[1].length > best[1].length) {
            best = group;
        }
    }
    return best == null ? null : [best[0], ...best[1].map(formatCsvRow)].join("\n");
}
