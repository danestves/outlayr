import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import ReloadIcon from "@hugeicons/core-free-icons/ReloadIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

const WIDTH = 1200;
const LINES = 28;
const STEP = 24;
const FAULT = 600;
const FAULT_DROP = 26;
const FADE = 780;
const TRAIL_LINE = 12;
const TRAIL_START = 360;
const MARK = 7;

const waveY = (line: number, x: number) =>
    24 + (line / LINES) * 200 + 14 * Math.sin(x / 140 + line * 0.35) + 9 * Math.sin(x / 61 + line * 0.9);

function wavePath(line: number, from: number, to: number, shift = 0) {
    const points: string[] = [];
    for (let x = from; x <= to; x += STEP) {
        points.push(`${x},${(waveY(line, x) + shift).toFixed(1)}`);
    }
    return `M${points.join("L")}`;
}

const lines = Array.from({ length: LINES }, (_, line) => ({
    line,
    opacity: (0.2 + 0.6 * Math.abs(Math.sin(line * 1.7))).toFixed(2),
}));

const trailEnd = waveY(TRAIL_LINE, FADE);

function Waves({ kind }: { kind: "crash" | "lost" }) {
    return (
        <svg
            aria-hidden
            className="stroke-app-tint h-48 w-full fill-none sm:h-64"
            preserveAspectRatio="none"
            viewBox={`0 0 ${WIDTH} 260`}
        >
            {lines.map(({ line, opacity }) =>
                kind === "crash" ? (
                    <g key={line} opacity={opacity}>
                        <path d={wavePath(line, 0, FAULT)} vectorEffect="non-scaling-stroke" />
                        <path d={wavePath(line, FAULT, WIDTH, FAULT_DROP)} vectorEffect="non-scaling-stroke" />
                    </g>
                ) : (
                    <g key={line} opacity={opacity}>
                        <path d={wavePath(line, 0, FADE)} vectorEffect="non-scaling-stroke" />
                        <path
                            d={wavePath(line, FADE, WIDTH)}
                            strokeDasharray="1 5"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </g>
                )
            )}
            {kind === "crash" ? (
                <path
                    d={`M${FAULT},${waveY(0, FAULT).toFixed(1)}V${(waveY(LINES - 1, FAULT) + FAULT_DROP).toFixed(1)}`}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                />
            ) : (
                <>
                    <path
                        className="stroke-foreground"
                        d={wavePath(TRAIL_LINE, TRAIL_START, FADE)}
                        strokeDasharray="3 4"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                    />
                    <path
                        d={`M${FADE - MARK},${trailEnd - MARK}L${FADE + MARK},${trailEnd + MARK}M${FADE + MARK},${trailEnd - MARK}L${FADE - MARK},${trailEnd + MARK}`}
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                    />
                </>
            )}
        </svg>
    );
}

function ErrorFrame({
    body,
    children,
    kind,
    title,
}: {
    body: ReactNode;
    children: ReactNode;
    kind: "crash" | "lost";
    title: ReactNode;
}) {
    return (
        <main className="app-shell flex min-h-dvh flex-col items-center pt-24 pb-12 text-center lg:min-h-full">
            <Waves kind={kind} />
            <h1 className="text-app-title mt-4 font-semibold">{title}</h1>
            <p className="text-muted-foreground text-app-label mt-1.5 px-4">{body}</p>
            {children}
        </main>
    );
}

export function LostPage() {
    const copy = useIntlayer("dashboard-shell");
    return (
        <ErrorFrame body={copy.lost.body} kind="lost" title={copy.lost.title}>
            <Button className="mt-5" render={<Link to="/" />}>
                {copy.toDashboard}
            </Button>
            <span className="text-muted-foreground text-app-caption mt-4 font-mono">404</span>
        </ErrorFrame>
    );
}

const HASH_SEED = 5381;
const HASH_FACTOR = 33;
const HASH_SPACE = 2 ** 32;
const HEX = 16;
const REF_LENGTH = 8;

function refOf(error: Error) {
    const text = `${error.name}:${error.message}:${error.stack ?? ""}`;
    let hash = HASH_SEED;
    for (const char of text) {
        hash = (hash * HASH_FACTOR + (char.codePointAt(0) ?? 0)) % HASH_SPACE;
    }
    return hash.toString(HEX).padStart(REF_LENGTH, "0");
}

const reload = () => window.location.reload();

export function CrashPage({ error }: ErrorComponentProps) {
    const copy = useIntlayer("dashboard-shell");
    const [copied, setCopied] = useState(false);
    const failure = error instanceof Error ? error : new Error(String(error));
    const ref = refOf(failure);
    const copyRef = async () => {
        await navigator.clipboard.writeText(`Ref ${ref}\n${failure.message}\n${failure.stack ?? ""}`);
        setCopied(true);
    };
    return (
        <ErrorFrame body={copy.crash.body} kind="crash" title={copy.crash.title}>
            <div className="mt-5 flex gap-2">
                <Button render={<Link to="/" />} variant="outline">
                    {copy.toDashboard}
                </Button>
                <Button onClick={reload}>
                    <HugeiconsIcon icon={ReloadIcon} strokeWidth={2} />
                    {copy.crash.reload}
                </Button>
            </div>
            <button
                aria-label={copied ? copy.crash.copied.value : copy.crash.copyRef.value}
                className="text-muted-foreground hover:text-foreground text-app-caption mt-4 flex items-center gap-1.5 font-mono"
                onClick={copyRef}
                type="button"
            >
                {copy.crash.ref({ id: ref })}
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} strokeWidth={2} />
            </button>
        </ErrorFrame>
    );
}
