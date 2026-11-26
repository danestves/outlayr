import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import type { CSSProperties } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useBudgetFlows } from "@/components/dashboard/budgets/flow-context";

import type { SetupState, SetupStep } from "./model";

const STEPS = ["account", "entry", "budget"] as const;

const MARK = {
    ok: "bg-app-income/15 text-app-income",
    on: "bg-app-tint text-app-on-tint",
    todo: "border-app-strong border",
} as const;

const stepState = (setup: SetupState, step: SetupStep) => {
    if (setup.step === step) {
        return "on";
    }
    return setup.done[step] ? "ok" : "todo";
};

export function SetupHero({ setup }: { setup: SetupState }) {
    const { add } = useIntlayer("dashboard");
    const accounts = useAccountFlows();
    const budgets = useBudgetFlows();
    const copy = useIntlayer("dashboard-home").setup;
    const title = {
        account: setup.done.entry ? copy.titleAccountNext : copy.titleAccount,
        budget: copy.titleBudget,
        entry: copy.titleEntry,
    }[setup.step];
    const cta = { account: copy.addAccount, budget: copy.addBudget, entry: add.entry }[setup.step];
    const start = () => {
        if (setup.step === "budget") {
            budgets.open({ categoryId: setup.firstSpendTopId, kind: "new" });
            return;
        }
        accounts.open(setup.step === "account" ? { kind: "create", type: "bank" } : { kind: "entry" });
    };
    return (
        <section className="bg-app-group border-border rounded-app-xl flex flex-wrap items-center gap-x-6 gap-y-4 border p-5">
            <div className="min-w-0 flex-1">
                <h1 className="text-app-heading font-semibold">{title}</h1>
                <ol className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
                    {STEPS.map((step, index) => {
                        const state = stepState(setup, step);
                        return (
                            <li
                                className={`text-app-label flex items-center gap-2 ${state === "on" ? "text-foreground font-medium" : "text-muted-foreground"}`}
                                key={step}
                            >
                                <span
                                    className={`dash-figure text-app-micro flex size-5 items-center justify-center rounded-full ${MARK[state]}`}
                                >
                                    {state === "ok" ? (
                                        <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                {copy.steps[step]}
                            </li>
                        );
                    })}
                </ol>
            </div>
            <Button onClick={start} size="lg">
                <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                {cta}
            </Button>
        </section>
    );
}

const GHOST: CSSProperties = { fill: "none", stroke: "var(--color-app-ghost)" };

const QUIET_COLUMNS = [
    [15, 50],
    [265, 47],
    [410, 43],
    [540, 45],
    [711, 40],
] as const;
const QUIET_ROWS = [52, 103] as const;

export function QuietTable() {
    return (
        <svg
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-auto w-full"
            style={{ maskImage: "linear-gradient(black 59px, transparent 150px)" }}
            viewBox="0 0 766 299"
        >
            {QUIET_COLUMNS.map(([x, head]) => (
                <rect height={9} key={x} rx={4.5} style={GHOST} width={head} x={x} y={15.5} />
            ))}
            <path d="M0 40H766" style={{ ...GHOST, stroke: "var(--color-app-strong)" }} />
            {QUIET_ROWS.map((top, row) => (
                <g key={top}>
                    <rect height={26} rx={8} style={GHOST} width={26} x={15} y={top} />
                    <rect height={9} rx={4.5} style={GHOST} width={[62, 78][row]} x={53} y={top + 8.5} />
                    <rect height={9} rx={4.5} style={GHOST} width={[75, 91][row]} x={265} y={top + 8.5} />
                    <rect height={9} rx={4.5} style={GHOST} width={[70, 54][row]} x={410} y={top + 8.5} />
                    <rect height={9} rx={4.5} style={GHOST} width={[41, 31][row]} x={540} y={top + 8.5} />
                    <rect
                        height={9}
                        rx={4.5}
                        style={GHOST}
                        width={[68, 46][row]}
                        x={751 - ([68, 46][row] ?? 0)}
                        y={top + 8.5}
                    />
                </g>
            ))}
        </svg>
    );
}
