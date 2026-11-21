import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { features } from "../src/features";
import type { Feature, Step } from "../src/features";

const SCHEME = "outlayr://";
const SEE_TIMEOUT_MS = 15_000;

const quote = (value: string) => {
    if (value.includes("\n") || value.endsWith("\\")) {
        throw new Error(`An agent-device replay line can't carry ${JSON.stringify(value)}`);
    }
    return `'${value.replaceAll("'", String.raw`\'`)}'`;
};

const toLine = (step: Step) => {
    if ("press" in step) {
        return `press ${quote(step.press)}`;
    }
    if ("fill" in step) {
        return `fill ${quote(step.fill[0])} ${quote(step.fill[1])}`;
    }
    if ("see" in step) {
        return `wait text ${quote(step.see)} ${SEE_TIMEOUT_MS}`;
    }
    if ("scroll" in step) {
        return `scroll ${step.scroll}`;
    }
    return "back";
};

const toScript = (feature: Feature) =>
    [`open ${quote(`${SCHEME}${feature.link.slice(1)}`)}`, ...feature.steps.map(toLine), ""].join("\n");

const isFeatureId = (id: string): id is keyof typeof features => Object.hasOwn(features, id);

const [id = "", separator, ...deviceArgs] = process.argv.slice(2);
if (!isFeatureId(id) || (separator !== undefined && separator !== "--")) {
    console.error(
        `Usage: verify <feature> [-- <agent-device session flags>]\nFeatures: ${Object.keys(features).join(", ")}`
    );
    process.exit(1);
}

const out = join(tmpdir(), "outlayr-verify", id);
mkdirSync(out, { recursive: true });
const script = join(out, `${id}.ad`);
const proof = join(out, `${id}.png`);
writeFileSync(script, toScript(features[id]));

const agentDevice = (args: string[]) => execFileSync("agent-device", [...args, ...deviceArgs], { stdio: "inherit" });
agentDevice(["replay", script]);
agentDevice(["screenshot", proof]);
console.log(`${features[id].proves}\nproof: ${proof}\nscript: ${script}`);
