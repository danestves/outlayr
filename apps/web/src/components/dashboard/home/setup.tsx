import { RiAddLine, RiCheckLine } from "@remixicon/react";
import type { CSSProperties, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import type { SetupState, SetupStep } from "./model";

const STEPS = ["account", "entry", "budget"] as const;

const stepState = (setup: SetupState, step: SetupStep) => {
    if (setup.step === step) {
        return "on";
    }
    return setup.done[step] ? "ok" : "todo";
};

export function SetupHero({ setup }: { setup: SetupState }) {
    const { add } = useIntlayer("dashboard");
    const copy = useIntlayer("dashboard-home").setup;
    const title = {
        account: setup.done.entry ? copy.titleAccountNext : copy.titleAccount,
        budget: copy.titleBudget,
        entry: copy.titleEntry,
    }[setup.step];
    const cta = { account: copy.addAccount, budget: copy.addBudget, entry: add.entry }[setup.step];
    return (
        <section className="bg-app-group border-border flex items-center gap-6 rounded-3xl border p-5">
            <div className="min-w-0 flex-1">
                <h1 className="text-xl leading-7 font-semibold tracking-[-0.01em]">{title}</h1>
                <ol className="mt-2.5 flex flex-wrap gap-[18px]">
                    {STEPS.map((step, index) => (
                        <li className="dash-step" data-state={stepState(setup, step)} key={step}>
                            <u>{setup.done[step] ? <RiCheckLine size={14} /> : index + 1}</u>
                            {copy.steps[step]}
                        </li>
                    ))}
                </ol>
            </div>
            <PhoneButton className="dash-btn h-11 px-[18px] text-[15px]">
                <RiAddLine size={18} />
                {cta}
            </PhoneButton>
        </section>
    );
}

// Creating things on web isn't built yet, so setup's calls to action say where to go instead of opening a form.
export function PhoneButton({ children, className }: { children: ReactNode; className: string }) {
    const { phoneHint } = useIntlayer("dashboard-home").setup;
    return (
        <button aria-disabled className={className} title={phoneHint.value} type="button">
            {children}
        </button>
    );
}

export function Cover({
    children,
    fade = "transparent 12%, var(--color-app-group) 62%",
    line,
    title,
}: {
    children?: ReactNode;
    fade?: string;
    line?: ReactNode;
    title?: ReactNode;
}) {
    return (
        <div className="dash-cover" style={{ background: `linear-gradient(to bottom, ${fade})` }}>
            {title ? <b className="text-[15px] leading-[22px] font-semibold">{title}</b> : null}
            {line ? <p className="text-muted-foreground mt-0.5 text-[13px]">{line}</p> : null}
            {children ? <div className="mt-3 flex items-center gap-2">{children}</div> : null}
        </div>
    );
}

export const LATE_FADE = "transparent 62%, var(--color-app-group) 76%";
export const TABLE_FADE = "transparent 45%, var(--color-app-group) 92%";

const GHOST: CSSProperties = { fill: "none", stroke: "var(--color-app-ghost)" };
const BARS = 51;
const WIDTH = 336;
const SWELL_AT = 0.75;

export function GhostRuler() {
    return (
        <svg aria-hidden className="block h-auto w-[calc(100%+2px)] overflow-visible" viewBox={`0 0 ${WIDTH} 124`}>
            {Array.from({ length: BARS }, (_, index) => {
                const at = index / (BARS - 1);
                const distance = (at - SWELL_AT) * BARS;
                const height = 14 + Math.exp(-(distance * distance) / 22) * 46;
                return (
                    <rect
                        height={height}
                        key={at}
                        rx={1.2}
                        strokeWidth={0.8}
                        style={GHOST}
                        width={2.4}
                        x={at * (WIDTH - 3) + 0.5}
                        y={94 - height}
                    />
                );
            })}
        </svg>
    );
}

const QUIET_BARS = [
    [20, 42.9],
    [86.8, 34.2],
    [153.6, 54.5],
    [220.4, 28.5],
    [287.2, 60.3],
] as const;

export function QuietBars() {
    return (
        <svg
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-auto w-full"
            style={{ maskImage: "linear-gradient(black 37px, transparent 99px)" }}
            viewBox="0 0 374 241"
        >
            <path d="M20 158.6H354" style={{ ...GHOST, stroke: "var(--color-app-strong)" }} />
            {QUIET_BARS.map(([x, y]) => (
                <rect height={158.6 - y} key={x} rx={3} style={GHOST} width={43.4} x={x} y={y} />
            ))}
        </svg>
    );
}

const QUIET_COLUMNS = [
    [20, 50],
    [237.8, 47],
    [368.5, 43],
    [491.9, 45],
    [706, 40],
] as const;
const QUIET_ROWS = [58, 100] as const;

export function QuietTable() {
    return (
        <svg
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-auto w-full"
            style={{ maskImage: "linear-gradient(black 59px, transparent 121px)" }}
            viewBox="0 0 766 299"
        >
            {QUIET_COLUMNS.map(([x, head]) => (
                <rect height={9} key={x} rx={4.5} style={GHOST} width={head} x={x} y={27.5} />
            ))}
            <path d="M0 50H766M0 92H766" style={{ ...GHOST, stroke: "var(--color-app-strong)" }} />
            {QUIET_ROWS.map((top, row) => (
                <g key={top}>
                    <rect height={26} rx={8} style={GHOST} width={26} x={20} y={top} />
                    <rect height={9} rx={4.5} style={GHOST} width={[62, 78][row]} x={56} y={top + 8.5} />
                    <rect height={22} rx={6} style={GHOST} width={[75, 91][row]} x={237.8} y={top + 2} />
                    <rect height={9} rx={4.5} style={GHOST} width={[70, 54][row]} x={368.5} y={top + 8.5} />
                    <rect height={9} rx={4.5} style={GHOST} width={[41, 31][row]} x={491.9} y={top + 8.5} />
                    <rect
                        height={9}
                        rx={4.5}
                        style={GHOST}
                        width={[68, 46][row]}
                        x={746 - ([68, 46][row] ?? 0)}
                        y={top + 8.5}
                    />
                </g>
            ))}
        </svg>
    );
}

const GHOST_BUDGETS = [44, 72, 64, 70, 58] as const;

export function GhostBudgets() {
    return (
        <div aria-hidden className="px-3.5 pt-2">
            {GHOST_BUDGETS.map((width) => (
                <div className="flex h-9 items-center gap-2" key={width}>
                    <i className="dash-gx size-5 rounded-full" />
                    <i className="dash-gl" style={{ width }} />
                    <i className="dash-gl ml-auto w-[84px]" />
                </div>
            ))}
        </div>
    );
}

const GHOST_ACCOUNTS = [50, 70, 34] as const;

export function GhostAccounts() {
    return (
        <div aria-hidden className="px-5">
            {GHOST_ACCOUNTS.map((width) => (
                <div className="flex h-10 items-center gap-2.5" key={width}>
                    <i className="dash-gx" />
                    <i className="dash-gl" style={{ width }} />
                    <i className="dash-gl ml-auto w-[76px]" />
                </div>
            ))}
        </div>
    );
}

const GHOST_ROWS = [
    [52, 84, 60, 36, 60],
    [34, 80, 70, 36, 54],
    [62, 76, 52, 36, 54],
    [56, 88, 70, 36, 54],
    [34, 80, 70, 36, 54],
    [62, 76, 52, 36, 54],
] as const;

export function GhostRows({ cell, label }: { cell: string; label: string }) {
    return GHOST_ROWS.map(([merchant, category, account, day, amount], index) => (
        <tr aria-hidden className="group" key={index}>
            <td aria-label={label} className={cell}>
                <span className="flex items-center gap-2.5">
                    <i className="dash-gx" />
                    <i className="dash-gl" style={{ width: merchant }} />
                </span>
            </td>
            <td aria-label={label} className={cell}>
                <i className="dash-gl relative -top-[3px] block h-[22px] rounded-md" style={{ width: category }} />
            </td>
            <td aria-label={label} className={cell}>
                <i className="dash-gl block" style={{ width: account }} />
            </td>
            <td aria-label={label} className={cell}>
                <i className="dash-gl block" style={{ width: day }} />
            </td>
            <td aria-label={label} className={cell}>
                <i className="dash-gl ml-auto block" style={{ width: amount }} />
            </td>
        </tr>
    ));
}
