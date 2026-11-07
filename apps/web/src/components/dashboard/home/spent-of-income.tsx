import { RiArrowRightUpLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { RangeMeter } from "panelui-web/range-meter";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { round } from "@/lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { useDateFormat } from "./format";
import { percentChange } from "./kpi-group";
import { snapWhatIf, whatIfStep } from "./model";
import type { SetupState } from "./model";
import { Cover, GhostRuler, LATE_FADE, QuietBars } from "./setup";

const PERCENT = 100;
const NO_INCOME_MAX = 1;
const OVER_TONE = "[--pu-color:var(--destructive)] [--pu-on-color:var(--color-app-float)]";
const WHAT_IF_TONE = "[--pu-color:var(--muted-foreground)] [--pu-on-color:var(--color-app-float)]";

const capitalize = (text: string) => `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;

function useWhatIf(income: number) {
    const [amount, setAmount] = useState<number | null>(null);
    const pointer = useRef<"cancelled" | "down" | "up">("up");
    const step = whatIfStep(income);
    const end = () => {
        pointer.current = "up";
        setAmount(null);
    };
    const cancel = () => {
        if (pointer.current === "down") {
            pointer.current = "cancelled";
        }
        setAmount(null);
    };
    return {
        amount: amount === null ? null : Math.min(amount, income),
        slider: {
            onBlur: cancel,
            onKeyDown: (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    cancel();
                }
            },
            onPointerCancel: end,
            onPointerDown: () => {
                pointer.current = "down";
            },
            onPointerUp: end,
            onValueChange: (value: number) => {
                if (pointer.current !== "cancelled") {
                    setAmount(snapWhatIf(value, step, income));
                }
            },
            step,
        },
    };
}

export function SpentOfIncome({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home");
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const { period } = filters;
    const figures = useMemo(
        () => kpis(ledger, period, { accounts: filters.accounts }),
        [filters.accounts, ledger, period]
    );
    const income = figures.income.value;
    const spent = figures.spent.value;
    const { prior } = figures.spent;
    const { delta } = figures.spent;
    const { amount: whatIf, slider } = useWhatIf(income);
    const shown = (value: number) => money(value, ledger.currency);
    const { title } = copy.spentOfIncome;
    if (setup && (income === 0 || spent === 0)) {
        return (
            <CardFrame className="min-h-[363px]" title={title}>
                <div className="px-4">
                    <GhostRuler />
                </div>
                {spent > 0 ? (
                    <Cover
                        fade={LATE_FADE}
                        line={copy.setup.logIncome}
                        title={copy.setup.spent({ amount: shown(spent) })}
                    />
                ) : (
                    <Cover fade={LATE_FADE} line={copy.setup.fillsIn} title={copy.setup.spentTitle} />
                )}
            </CardFrame>
        );
    }
    if (quiet) {
        return (
            <CardFrame
                footer={
                    <>
                        <span className="text-muted-foreground text-[13px]">{copy.kpi.kept}</span>
                        <span className="dash-figure font-medium">{shown(0)}</span>
                        <span className="dash-trend" data-tone="flat">
                            0%
                        </span>
                    </>
                }
                title={title}
            >
                <div className="dash-empty relative isolate min-h-[248px] justify-end pt-0 pb-7">
                    <QuietBars />
                    <b className="text-[15px] font-semibold">{copy.quiet.spentTitle}</b>
                    <p className="text-muted-foreground mb-2.5 text-[13px]">{copy.quiet.spentLine}</p>
                </div>
            </CardFrame>
        );
    }
    const priorMonth = periodOf(shiftPeriodKey(period.key, -1), ledger.firstDayOfMonth).key;
    const hasIncome = income > 0;
    const over = hasIncome && spent > income;
    const previewing = whatIf !== null;
    const kept = previewing ? round(ledger, income - whatIf) : figures.kept.value;
    const keptShare = hasIncome ? kept / income : null;
    const overBy = over ? `${shown(round(ledger, spent - income))} ${copy.spentOfIncome.over.value}` : null;
    const realText = overBy ? `${shown(spent)}, ${overBy}` : shown(spent);
    const previewText = `${copy.spentOfIncome.whatIf.value} ${shown(whatIf ?? 0)}, ${copy.spentOfIncome.wouldKeep.value} ${shown(kept)}`;
    let tone = "";
    if (previewing) {
        tone = WHAT_IF_TONE;
    } else if (over || (!hasIncome && spent > 0)) {
        tone = OVER_TONE;
    }
    let action: ReactNode = null;
    if (previewing) {
        action = (
            <span className="dash-trend bg-app-strong text-foreground font-sans">{copy.spentOfIncome.whatIf}</span>
        );
    } else if (delta !== null) {
        action = (
            <span className="dash-trend" data-tone={delta > 0 ? "poor" : "good"}>
                {percentChange(delta)}
            </span>
        );
    }
    return (
        <CardFrame
            action={action}
            footer={
                <>
                    <span className="text-muted-foreground text-[13px] whitespace-nowrap">
                        {previewing ? copy.spentOfIncome.wouldKeep : copy.kpi.kept}
                    </span>
                    <span
                        className={`dash-figure font-medium ${previewing ? "decoration-muted-foreground underline decoration-dashed underline-offset-3" : ""}`}
                    >
                        {shown(kept)}
                    </span>
                    {keptShare === null ? null : (
                        <span className="dash-trend max-[480px]:hidden" data-tone={kept < 0 ? "poor" : "flat"}>
                            {Math.round(keptShare * PERCENT)}%
                        </span>
                    )}
                    <Link className={`dash-ob ml-auto ${previewing ? "max-[480px]:hidden" : ""}`} to="/app/insights">
                        {copy.spentOfIncome.cashFlow}
                        <RiArrowRightUpLine size={15} />
                    </Link>
                </>
            }
            title={title}
        >
            <div className="flex-1 px-4 pt-2 pb-[18px]">
                <RangeMeter
                    aria-description={hasIncome ? copy.spentOfIncome.whatIfHint.value : undefined}
                    className={`dash-figure touch-pan-y [&>[aria-hidden]]:h-16 ${tone}`}
                    formatValue={(value) =>
                        previewing ? `${copy.spentOfIncome.whatIfTag.value} ${shown(value)}` : shown(spent)
                    }
                    label={title.value}
                    marker={hasIncome ? prior : Number(prior > 0)}
                    max={hasIncome ? income : NO_INCOME_MAX}
                    value={whatIf ?? (hasIncome ? Math.min(spent, income) : Number(spent > 0))}
                    valueText={previewing ? previewText : realText}
                    {...(hasIncome ? slider : {})}
                />
                <RangeMeter.Scale
                    className="dash-figure mt-5 text-[13px]"
                    end={hasIncome ? shown(income) : copy.spentOfIncome.noIncome}
                    start={moneyIn(0, ledger.currency, "auto", false)}
                />
                <div className="mt-3.5 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
                        <u aria-hidden className="bg-foreground block size-[7px] rotate-45 rounded-[1px]" />
                        {capitalize(date.month(priorMonth))}
                    </span>
                    <span className="dash-figure">{shown(prior)}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
                        {capitalize(date.month(period.key))}
                        {overBy ? <span className="text-app-spend">{overBy}</span> : null}
                    </span>
                    <span className="dash-figure">{shown(spent)}</span>
                </div>
            </div>
        </CardFrame>
    );
}
