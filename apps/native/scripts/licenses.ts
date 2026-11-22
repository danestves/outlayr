import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { nativeRoot, readIosBundle } from "./export-ios-bundle";

type License = (typeof import("../src/screens/settings/licenses.json"))[number];

const outFile = join(nativeRoot, "src", "screens", "settings", "licenses.json");
const repoRoot = resolve(nativeRoot, "..", "..");
const podfileLock = join(nativeRoot, "ios", "Podfile.lock");
const acknowledgements = join(
    nativeRoot,
    "ios",
    "Pods",
    "Target Support Files",
    "Pods-Outlayr",
    "Pods-Outlayr-acknowledgements.plist"
);

const PACKAGE_ROOT = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//;
const LICENSE_FILE = /^(licen[cs]e|copying)/i;
const LINE_EDGES = /^[ \t]+|[ \t]+$/gm;
const HARD_WRAP = /(?<=\S)\n(?=(?!\d+\.\s|[-*•]\s|\([a-z0-9]+\)\s)\S)/g;

const { values: args } = parseArgs({ options: { check: { type: "boolean" } } });

interface Entry {
    licenses: Set<string>;
    pod: boolean;
    texts: Set<string>;
    versions: Set<string>;
}

const entries = new Map<string, Entry>();

const reflow = (text: string) =>
    text
        .replaceAll("\r\n", "\n")
        .replaceAll(LINE_EDGES, "")
        .replaceAll(HARD_WRAP, " ")
        .replaceAll(/\n{3,}/g, "\n\n")
        .trim();

function add({ name, version, license, text, pod }: License): void {
    const entry = entries.get(name) ?? { licenses: new Set(), pod, texts: new Set(), versions: new Set() };
    entry.versions.add(version);
    entry.licenses.add(license);
    entry.texts.add(reflow(text));
    entries.set(name, entry);
}

function addPackages(map: string): void {
    const parsed = JSON.parse(map) as { sections?: { map: { sources: string[] } }[]; sources?: string[] };
    const sources = parsed.sources ?? parsed.sections?.flatMap((section) => section.map.sources);
    if (!sources) {
        throw new Error("The bundle's source map lists no sources.");
    }
    const roots = new Set(sources.map((source) => PACKAGE_ROOT.exec(source)?.[1]).filter((root) => root != null));
    for (const root of roots) {
        const dir = join(repoRoot, root);
        const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8")) as {
            license?: string | { type: string };
            name: string;
            version: string;
        };
        const license = (typeof pkg.license === "string" ? pkg.license : pkg.license?.type) ?? "UNKNOWN";
        const file = readdirSync(dir).find((name) => LICENSE_FILE.test(name));
        const text = file ? readFileSync(join(dir, file), "utf-8") : license;
        add({ license, name: pkg.name, pod: false, text, version: pkg.version });
    }
}

function downloadedPods(lock: string): Map<string, string> {
    const [pods = "", rest = ""] = lock.split("\nDEPENDENCIES:");
    const versions = new Map(
        [...pods.matchAll(/^ {2}- ([^/\s]+)\S* \(([^)]+)\)/gm)].flatMap(([, name, version]) =>
            name === undefined || version === undefined ? [] : [[name, version] as const]
        )
    );
    const specRepos = rest.split("SPEC REPOS:")[1]?.split("\n\n")[0] ?? "";
    const names = [
        ...[...specRepos.matchAll(/^ {4}- (\S+)$/gm)].flatMap(([, name]) => (name === undefined ? [] : [name])),
        ...[...rest.matchAll(/^ {2}(\S+):\n(?: {4}.+\n)*? {4}:tag:/gm)].flatMap(([, name]) =>
            name === undefined ? [] : [name]
        ),
    ];
    return new Map(names.map((name) => [name, versions.get(name) ?? ""]));
}

function addPods(): void {
    if (!existsSync(podfileLock) || !existsSync(acknowledgements)) {
        console.warn("No ios/ build, so the pods already in licenses.json are kept.");
        const previous = JSON.parse(readFileSync(outFile, "utf-8")) as License[];
        for (const pod of previous.filter((license) => license.pod)) {
            add(pod);
        }
        return;
    }
    const plist = execFileSync("plutil", ["-convert", "json", "-o", "-", acknowledgements], { encoding: "utf-8" });
    const specifiers = (
        JSON.parse(plist) as { PreferenceSpecifiers: { FooterText?: string; License?: string; Title: string }[] }
    ).PreferenceSpecifiers;
    for (const [name, version] of downloadedPods(readFileSync(podfileLock, "utf-8"))) {
        const acknowledgement = specifiers.find((specifier) => specifier.Title === name);
        if (!acknowledgement?.FooterText) {
            throw new Error(`CocoaPods wrote no acknowledgement for ${name}`);
        }
        add({
            license: acknowledgement.License ?? "UNKNOWN",
            name,
            pod: true,
            text: acknowledgement.FooterText,
            version,
        });
    }
}

readIosBundle((_bundle, map) => addPackages(map));
addPods();

const list: License[] = [...entries]
    .map(([name, entry]) => ({
        license: [...entry.licenses].join(", "),
        name,
        pod: entry.pod,
        text: [...entry.texts].join("\n\n"),
        version: [...entry.versions].join(", "),
    }))
    .toSorted((a, b) => a.name.localeCompare(b.name, "en"));
const json = `${JSON.stringify(list, null, 4)}\n`;

if (args.check) {
    if (readFileSync(outFile, "utf-8") !== json) {
        console.error("licenses.json is stale: run `node --import tsx scripts/licenses.ts` in apps/native.");
        process.exit(1);
    }
    console.log(`licenses.json is current, ${list.length} entries.`);
} else {
    writeFileSync(outFile, json);
    console.log(`Wrote ${list.length} entries to licenses.json.`);
}
