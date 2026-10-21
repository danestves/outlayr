// Measures a perf change against main on the perf emulator: alternating base and PR cold starts from the snapshot,
// each replaying an Argent flow. Argent keeps only commits over 16 ms, so a `--components` entry that renders only in
// fast commits reads 0. `--prod` needs each Metro on `--no-dev --minify` and drops the React rows.
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { availableParallelism, loadavg } from "node:os";
import { dirname, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

const APP = "com.tryoutlayr.app";
const SNAPSHOT = "perf-seeded";
const READY_TEXT = "Hide amounts";
const MAX_ATTEMPTS = 5;
const LAUNCHES = 4;
const LAUNCH_POLLS = 22;
// Metro drops a dead app within about 65 s (a ping every 5 s, 60 s without a pong).
const DRAIN_POLLS = 40;
const STARTUP_SETTLE_MS = 10_000;

const { values: args } = parseArgs({
    options: {
        base: { type: "string" },
        components: { type: "string" },
        device: { default: "emulator-5580", type: "string" },
        flow: { type: "string" },
        out: { type: "string" },
        pr: { type: "string" },
        prod: { default: false, type: "boolean" },
        runs: { default: "3", type: "string" },
    },
});

if (args.flow === undefined || args.base === undefined || args.pr === undefined) {
    throw new Error("Usage: measure.ts --flow <name> --base <metro port> --pr <metro port> [--runs N] [--prod]");
}

const { device, flow, prod } = args;
const runCount = Number(args.runs);
if (!Number.isInteger(runCount) || runCount < 1) {
    throw new Error(`--runs must be a positive integer, got ${args.runs}`);
}
const flowFile = resolve(import.meta.dirname, "flows", `${flow}.yaml`);
const setupFile = resolve(import.meta.dirname, "flows", `${flow}-setup.yaml`);
const components = args.components?.split(",").filter(Boolean) ?? [];
if (prod && components.length > 0) {
    throw new Error("--components needs React's profiler, which a --prod bundle does not have.");
}
const sides = { base: Number(args.base), pr: Number(args.pr) } as const;
type Side = keyof typeof sides;

// Percentiles come from the gfxinfo histogram, so they snap to its buckets.
const FRAME_STATS = {
    frames: { label: "Frames", pattern: /Total frames rendered: (\d+)/ },
    jankyFrames: { label: "Janky frames", pattern: /Janky frames: (\d+)/ },
    p50: { label: "Frame time p50 (ms)", pattern: /50th percentile: (\d+)ms/ },
    p90: { label: "Frame time p90 (ms)", pattern: /90th percentile: (\d+)ms/ },
    p95: { label: "Frame time p95 (ms)", pattern: /95th percentile: (\d+)ms/ },
    p99: { label: "Frame time p99 (ms)", pattern: /99th percentile: (\d+)ms/ },
} as const;

interface ThreadCpu {
    js: number;
    ui: number;
}

interface Run {
    causes?: Record<string, string>;
    commits?: number;
    components?: Record<string, number>;
    fiberRenders?: number;
    cpuMs: ThreadCpu;
    frames: Record<string, number>;
    hotCommits?: number;
    profiledMs: number;
    side: Side;
}

const adb = (...rest: string[]) => execFileSync("adb", ["-s", device, ...rest], { encoding: "utf-8" });

// argent reports tool failures as plain text, not JSON.
function argent(tool: string, flags: string[]): Record<string, unknown> {
    const output = execFileSync("argent", ["run", tool, ...flags], { encoding: "utf-8" }).trim();
    if (!output.startsWith("{")) {
        throw new Error(`argent ${tool}: ${output}`);
    }
    return JSON.parse(output) as Record<string, unknown>;
}

const OCCURRENCES = /\*\*Total occurrences:\*\* (\d+)/;

function rendersOf(component: string, target: string[]): { causes: string; renders: number } {
    const output = execFileSync(
        "argent",
        [
            "run",
            "profiler-commit-query",
            ...target,
            "--mode",
            "by_component",
            "--component_name",
            component,
            "--top_n",
            "10",
        ],
        { encoding: "utf-8" }
    );
    if (output.includes("not found in this profiling session")) {
        return { causes: "", renders: 0 };
    }
    const renders = OCCURRENCES.exec(output)?.[1];
    if (renders === undefined) {
        throw new Error(`profiler-commit-query ${component}: ${output.slice(0, 300)}`);
    }
    return { causes: output, renders: Number(renders) };
}

function readFrameStats(): Record<string, number> {
    const output = adb("shell", "dumpsys", "gfxinfo", APP);
    return Object.fromEntries(
        Object.entries(FRAME_STATS).map(([stat, { pattern }]) => {
            const value = pattern.exec(output)?.[1];
            if (value === undefined) {
                throw new Error(`dumpsys gfxinfo has no ${stat}: ${output.slice(0, 300)}`);
            }
            return [stat, Number(value)];
        })
    );
}

// /proc counts in 10 ms ticks.
function threadCpu(): ThreadCpu & { pid: string } {
    const pid = adb("shell", "pidof", APP).trim();
    // A thread can exit between the glob and the read.
    const stats = adb("shell", `cat /proc/${pid}/task/*/stat 2>/dev/null; true`).trim().split("\n");
    const msOf = (stat: string | undefined) => {
        // utime and stime, the 14th and 15th fields; the name before them can hold spaces.
        const fields = stat?.slice(stat.lastIndexOf(")") + 2).split(" ") ?? [];
        return (Number(fields[11]) + Number(fields[12])) * 10;
    };
    const js = stats.find((stat) => stat.includes("(mqt_v_js)"));
    if (js === undefined) {
        throw new Error(`No JS thread (mqt_v_js) in ${APP} ${pid}.`);
    }
    return { js: msOf(js), pid, ui: msOf(stats.find((stat) => stat.startsWith(`${pid} `))) };
}

/** Throws when the side's Metro serves the wrong bundle for the mode. */
async function checkMetroMode(port: number) {
    const manifest = (await fetch(`http://localhost:${port}/`, {
        headers: { accept: "application/expo+json", "expo-platform": "android" },
    }).then((response) => response.json())) as { launchAsset?: { url?: string } };
    const url = manifest.launchAsset?.url ?? "";
    const servesProd = url.includes("dev=false") && url.includes("minify=true");
    if (servesProd !== prod) {
        throw new Error(
            `Metro on ${port} serves ${url}; ${prod ? "start it with --no-dev --minify" : "drop --no-dev and --minify, or pass --prod"}.`
        );
    }
}

async function debugTargetCount(port: number): Promise<number> {
    const targets = (await fetch(`http://localhost:${port}/json/list`).then((response) =>
        response.json()
    )) as unknown[];
    return targets.length;
}

async function debugTargetAttached(port: number, polls: number): Promise<boolean> {
    for (let poll = 0; poll < polls; poll += 1) {
        if ((await debugTargetCount(port)) > 0) {
            return true;
        }
        await sleep(2000);
    }
    return false;
}

// A dead app stays listed until Metro's heartbeat gives up (about a minute), under the id a relaunch registers.
async function waitForNoDebugTarget(port: number) {
    for (let poll = 0; poll < DRAIN_POLLS; poll += 1) {
        if ((await debugTargetCount(port)) === 0) {
            return;
        }
        await sleep(2000);
    }
    throw new Error(`Metro on ${port} still lists an app ${DRAIN_POLLS * 2} s after it was stopped.`);
}

// Through the host address, not `adb reverse`: the emulator's adb connection can drop mid-flow and a reverse tunnel
// takes the profiler's debugger with it. Right after a snapshot load the guest network can time out connecting, leaving
// the dev client on its error screen, so an app that has not attached is relaunched.
async function startOn(port: number) {
    // Stopped before the load, so its socket closes now rather than at Metro's heartbeat timeout.
    adb("shell", "am", "force-stop", APP);
    const loaded = adb("emu", "avd", "snapshot", "load", SNAPSHOT);
    if (!loaded.includes("OK")) {
        throw new Error(`Snapshot ${SNAPSHOT} did not load: ${loaded}`);
    }
    adb("wait-for-device");
    const url = encodeURIComponent(`http://10.0.2.2:${port}`);
    let attached = false;
    for (let launch = 0; launch < LAUNCHES && !attached; launch += 1) {
        adb("shell", "am", "force-stop", APP);
        // oxlint-disable-next-line no-await-in-loop -- the stopped app must leave Metro's list before the next launch
        await waitForNoDebugTarget(port);
        adb(
            "shell",
            "am",
            "start",
            "-a",
            "android.intent.action.VIEW",
            "-d",
            `exp+outlayr://expo-development-client/?url=${url}`,
            APP
        );
        // oxlint-disable-next-line no-await-in-loop -- each launch waits for the previous one to attach
        attached = await debugTargetAttached(port, LAUNCH_POLLS);
    }
    if (!attached) {
        throw new Error(`No app attached to Metro on ${port} after ${LAUNCHES} launches.`);
    }
    const ready = argent("await-ui-element", [
        "--udid",
        device,
        "--condition",
        "visible",
        "--selector-json",
        JSON.stringify({ text: READY_TEXT }),
        "--timeoutMs",
        "120000",
    ]);
    if (ready.success !== true) {
        throw new Error(`The Log never showed on ${port}: ${JSON.stringify(ready)}`);
    }
}

async function waitForQuietHost() {
    for (let check = 0; check < 30 && (loadavg()[0] ?? 0) > availableParallelism() * 1.5; check += 1) {
        // oxlint-disable-next-line no-await-in-loop -- polling
        await sleep(10_000);
    }
    if ((loadavg()[0] ?? 0) > availableParallelism() * 1.5) {
        process.stderr.write(`Host load still ${loadavg()[0]?.toFixed(1)} after five minutes; measuring anyway.\n`);
    }
}

function runFlow(): Pick<Run, "cpuMs" | "frames"> {
    adb("shell", "dumpsys", "gfxinfo", APP, "reset");
    const before = threadCpu();
    execFileSync("argent", ["flow", "run", flowFile, "--device", device], { stdio: "inherit" });
    const after = threadCpu();
    if (after.pid !== before.pid) {
        throw new Error(`${APP} restarted during the flow (${before.pid} to ${after.pid}).`);
    }
    return { cpuMs: { js: after.js - before.js, ui: after.ui - before.ui }, frames: readFrameStats() };
}

async function measure(side: Side): Promise<Run> {
    const port = sides[side];
    await waitForQuietHost();
    await startOn(port);
    const target = ["--device_id", device, "--port", String(port)];
    if (!prod) {
        argent("debugger-connect", target);
    }
    // Startup work (session, entitlement, adoption) still lands a context commit or two after the
    // Log shows; profiled, it reads as a render the flow never caused.
    await sleep(STARTUP_SETTLE_MS);
    if (existsSync(setupFile)) {
        execFileSync("argent", ["flow", "run", setupFile, "--device", device], { stdio: "inherit" });
    }
    if (prod) {
        const started = performance.now();
        const measured = runFlow();
        return { ...measured, profiledMs: Math.round(performance.now() - started), side };
    }
    argent("react-profiler-start", target);
    // The debugger can drop a couple of seconds after the start; fail before the flow rather than after it.
    await sleep(3000);
    const status = argent("react-profiler-status", target);
    if (status.session_status !== "active") {
        throw new Error(`The profiler session dropped right after it started: ${JSON.stringify(status)}`);
    }
    const { cpuMs, frames } = runFlow();
    const stopped = argent("react-profiler-stop", target);
    const commits = Number(stopped.total_react_commits);
    if (!Number.isFinite(commits) || commits < 1) {
        throw new Error(`The profiler captured no commits on ${side}: ${JSON.stringify(stopped)}`);
    }
    const hotCommits = Array.isArray(stopped.hot_commit_indices) ? stopped.hot_commit_indices.length : 0;
    const queried = new Map(
        components.map((component) => [
            component,
            hotCommits === 0 ? { causes: "", renders: 0 } : rendersOf(component, target),
        ])
    );
    return {
        causes: Object.fromEntries([...queried].map(([component, { causes }]) => [component, causes])),
        commits,
        components: Object.fromEntries([...queried].map(([component, { renders }]) => [component, renders])),
        cpuMs,
        fiberRenders: Number(stopped.fiber_renders_captured),
        frames,
        hotCommits,
        profiledMs: Math.round(Number(stopped.duration_ms)),
        side,
    };
}

async function measureWithRetries(side: Side): Promise<Run> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            // oxlint-disable-next-line no-await-in-loop -- attempts share one emulator
            return await measure(side);
        } catch (error) {
            if (attempt === MAX_ATTEMPTS) {
                throw error;
            }
            let screen = resolve(args.out === undefined ? "." : dirname(args.out), `failed-${side}-${Date.now()}.png`);
            try {
                writeFileSync(screen, execFileSync("adb", ["-s", device, "exec-out", "screencap", "-p"]));
            } catch {
                screen = "not captured";
            }
            process.stderr.write(
                `Retrying ${side} (screen: ${screen}): ${error instanceof Error ? error.message : String(error)}\n`
            );
        }
    }
}

const median = (values: number[]) => {
    const sorted = values.toSorted((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
};

async function main() {
    await Promise.all(Object.values(sides).map(checkMetroMode));
    const runs: Run[] = [];
    for (let round = 0; round < runCount; round += 1) {
        const order: Side[] = round % 2 === 0 ? ["base", "pr"] : ["pr", "base"];
        for (const side of order) {
            // oxlint-disable-next-line no-await-in-loop -- runs share one emulator, so they must not overlap
            const run = await measureWithRetries(side);
            runs.push(run);
            const { causes: _causes, ...summary } = run;
            process.stdout.write(`${JSON.stringify(summary)}\n`);
        }
    }

    const labels = {
        commits: "React commits",
        fiberRenders: "Component renders",
        hotCommits: "Commits over 16 ms",
        profiledMs: "Flow time (ms)",
    } as const;
    const metrics: (keyof typeof labels)[] = prod
        ? ["profiledMs"]
        : ["commits", "fiberRenders", "hotCommits", "profiledMs"];
    const row = (label: string, value: (run: Run) => number) => {
        const base = median(runs.filter((run) => run.side === "base").map(value));
        const pr = median(runs.filter((run) => run.side === "pr").map(value));
        const change = base === 0 ? "n/a" : `${(((pr - base) / base) * 100).toFixed(1)}%`;
        return `| ${label} | ${base} | ${pr} | ${change} |`;
    };
    const rows = [
        ...metrics.map((metric) => row(labels[metric], (run) => run[metric] ?? 0)),
        row("JS thread CPU (ms)", (run) => run.cpuMs.js),
        row("UI thread CPU (ms)", (run) => run.cpuMs.ui),
        ...Object.entries(FRAME_STATS).map(([stat, { label }]) => row(label, (run) => run.frames[stat] ?? 0)),
        ...components.map((component) =>
            row(`\`${component}\` renders in slow commits`, (run) => run.components?.[component] ?? 0)
        ),
    ];
    const neverRendered = components.filter((component) => runs.every((run) => run.components?.[component] === 0));
    if (neverRendered.length > 0) {
        process.stderr.write(
            `Never rendered in a slow commit on either side; check the names, or they only render in fast commits: ${neverRendered.join(", ")}\n`
        );
    }
    const table = [
        `Flow \`${flow}\`, median of ${runCount} runs per side, alternated, on ${device}${prod ? ", production JS" : ""}.`,
        "",
        "| Metric | main | PR | Change |",
        "|---|---|---|---|",
        ...rows,
    ].join("\n");
    process.stdout.write(`\n${table}\n`);
    if (args.out !== undefined) {
        writeFileSync(args.out, JSON.stringify({ flow, prod, runs, table }, null, 2));
    }
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
