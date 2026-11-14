import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import CircleIcon from "@hugeicons/core-free-icons/CircleIcon";
import RecordIcon from "@hugeicons/core-free-icons/RecordIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { LogoMark } from "@/components/logo-mark";
import { ONBOARDING_STEPS, stepIndex } from "@/lib/onboarding";
import type { OnboardingScreen, OnboardingStep } from "@/lib/onboarding";

export const HEADLINE = "text-2xl leading-8 font-semibold tracking-[-0.02em]";
export const QUIET = "text-muted-foreground text-[13px] leading-5";
export const FIELD =
    "border-input bg-background dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/30 flex h-9 w-full items-center gap-2 rounded-lg border px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-[3px]";
export const FIELD_OPEN = "data-popup-open:border-ring data-popup-open:ring-ring/30 data-popup-open:ring-[3px]";

const RAIL_KEY = {
    "auto-log": "autoLog",
    currency: "currency",
    "first-entry": "firstEntry",
    rhythm: "rhythm",
} as const satisfies Record<OnboardingStep, string>;

export function Brand({ className = "" }: { className?: string }) {
    return (
        <div className={`flex items-center gap-[9px] text-[15px] font-semibold ${className}`}>
            <LogoMark className="text-app-tint size-6 shrink-0" />
            Outlayr
        </div>
    );
}

function TopBar({ step }: { step: number | null }) {
    const { stepOf } = useIntlayer("dashboard-onboarding");
    return (
        <header className="border-border flex h-16 shrink-0 items-center gap-3 border-b px-6 max-sm:px-4">
            <Brand className="mr-auto" />
            {step === null ? null : (
                <span className={`dash-figure ${QUIET}`}>{stepOf({ step, total: ONBOARDING_STEPS.length })}</span>
            )}
        </header>
    );
}

const RAIL_ITEM = "mb-0.5 flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left font-medium";

function StepRail({ current, onPick }: { current: OnboardingScreen; onPick: (step: OnboardingStep) => void }) {
    const { rail, railLabel } = useIntlayer("dashboard-onboarding");
    const at = stepIndex(current);
    return (
        <nav aria-label={railLabel.value} className="border-border w-60 shrink-0 border-r px-3 py-5 max-lg:hidden">
            <ol>
                {ONBOARDING_STEPS.map((step, index) => {
                    const label = rail[RAIL_KEY[step]];
                    if (index < at) {
                        return (
                            <li key={step}>
                                <button
                                    className={`${RAIL_ITEM} text-muted-foreground hover:bg-app-fill/60 hover:text-foreground focus-visible:ring-ring/30 outline-none focus-visible:ring-[3px]`}
                                    onClick={() => onPick(step)}
                                    type="button"
                                >
                                    <HugeiconsIcon className="text-app-income" icon={CheckmarkCircle02Icon} size={17} />
                                    {label}
                                </button>
                            </li>
                        );
                    }
                    const on = index === at;
                    return (
                        <li
                            aria-current={on ? "step" : undefined}
                            className={`${RAIL_ITEM} ${on ? "bg-app-fill text-foreground" : "text-muted-foreground"}`}
                            key={step}
                        >
                            <HugeiconsIcon
                                className={on ? "text-app-tint" : undefined}
                                icon={on ? RecordIcon : CircleIcon}
                                size={17}
                            />
                            {label}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

/** A screen outside the steps: the brand bar over one column, centred in the window rather than under the bar. */
export function Solo({ children, width }: { children: ReactNode; width: string }) {
    return (
        <div className="flex min-h-dvh flex-col">
            <TopBar step={null} />
            <main className="flex flex-1 items-center justify-center px-6 pt-8 pb-24 max-sm:px-4">
                <div className={`w-full ${width}`}>{children}</div>
            </main>
        </div>
    );
}

/** One of the steps, or the summary that closes them: the bar, the rail and a vertically centred stage. */
export function Staged({
    children,
    current,
    layout,
    onPick,
}: {
    children: ReactNode;
    current: OnboardingScreen;
    layout: string;
    onPick: (step: OnboardingStep) => void;
}) {
    const index = stepIndex(current);
    return (
        <div className="flex min-h-dvh flex-col">
            <TopBar step={Math.min(index + 1, ONBOARDING_STEPS.length)} />
            <div className="flex min-h-0 flex-1">
                <StepRail current={current} onPick={onPick} />
                <main
                    className={`grid min-w-0 flex-1 content-center items-start gap-4 px-12 py-8 max-lg:px-6 max-sm:px-4 ${layout}`}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}

/** The card with no header strip: one surface holding a headline, its fields and its actions. */
export function Plate({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <section
            className={`border-border bg-card flex min-w-0 flex-col overflow-hidden rounded-3xl border shadow-xs ${className}`}
        >
            {children}
        </section>
    );
}

export function PlateHead({ body, title }: { body?: ReactNode; title: ReactNode }) {
    return (
        <div className="px-5 pt-5 pb-4">
            <h1 className={HEADLINE}>{title}</h1>
            {body ? <p className={`mt-1.5 ${QUIET}`}>{body}</p> : null}
        </div>
    );
}

export function PlateFoot({ children }: { children: ReactNode }) {
    return <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-3.5">{children}</div>;
}

export function Tile({ children }: { children: ReactNode }) {
    return (
        <span className="bg-app-fill text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg">
            {children}
        </span>
    );
}

/** A ref callback: React skips autoFocus on a client-side screen change here. */
export const focusOnMount = (node: HTMLElement | null) => node?.focus();

const SLOT = /(\{\w+\})/u;

/** A translated sentence with a control set into it: "Spent {amount} on {category} today." */
export function slotted(text: string, slots: Readonly<Record<string, ReactNode>>) {
    return text
        .split(SLOT)
        .filter((part) => part !== "")
        .map((part) => ({ key: part, node: part.startsWith("{") ? (slots[part.slice(1, -1)] ?? part) : part }));
}
