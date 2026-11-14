import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { RangeMeter } from "panelui-web/range-meter";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { round } from "@/lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { CardFrame } from "./card-frame";
import { categoryTone, percentChange, useDateFormat } from "./format";
import { categorySpend, snapWhatIf, whatIfStep } from "./model";
import type { SetupState } from "./model";
import { Cover, GhostRuler, LATE_FADE, QuietBars } from "./setup";

const PERCENT = 100;
const NO_INCOME_MAX = 1;
const OVER_TONE = "[--pu-color:var(--destructive)] [--pu-on-color:var(--color-app-float)]";
const WHAT_IF_TONE = "[--pu-color:var(--muted-foreground)] [--pu-on-color:var(--color-app-float)]";

const TREND = "dash-figure flex h-auto rounded-full border-0 px-2 py-0.5 text-xs leading-4 font-medium";
const TREND_FLAT = `${TREND} bg-app-fill text-muted-foreground`;
const TREND_POOR = `${TREND} text-app-spend bg-[color-mix(in_oklab,var(--color-app-spend)_16%,transparent)]!`;
const TREND_GOOD = `${TREND} text-app-income bg-[color-mix(in_oklab,var(--color-app-income)_14%,transparent)]!`;

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

function SpentSetup({ spent }: { spent: number }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home");
    const { money } = useDisplayFormat();
    const shown = (value: number) => money(value, ledger.currency);
    const { title } = copy.spentOfIncome;
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

function SpentQuiet() {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home");
    const { money } = useDisplayFormat();
    const shown = (value: number) => money(value, ledger.currency);
    const { title } = copy.spentOfIncome;
    return (
        <CardFrame
            footer={
                <>
                    <span className="text-muted-foreground text-[13px] leading-5">{copy.kpi.kept}</span>
                    <span className="dash-figure font-medium">{shown(0)}</span>
                    <Badge className={TREND_FLAT} size="sm" variant="secondary">
                        0%
                    </Badge>
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

function SpentAction({ delta, previewing }: { delta: number | null; previewing: boolean }) {
    const { whatIf } = useIntlayer("dashboard-home").spentOfIncome;
    if (previewing) {
        return (
            <Badge className={TREND_FLAT} size="sm" variant="secondary">
                {whatIf}
            </Badge>
        );
    }
    if (delta === null) {
        return null;
    }
    return (
        <Badge
            className={delta > 0 ? TREND_POOR : TREND_GOOD}
            size="sm"
            variant={delta > 0 ? "destructive" : "success"}
        >
            {percentChange(delta)}
        </Badge>
    );
}

function SpentFooter({
    income,
    kept,
    previewing,
    share,
    spent,
}: {
    income: number;
    kept: number;
    previewing: boolean;
    share: number | null;
    spent: number;
}) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home");
    const { money } = useDisplayFormat();
    const shown = (value: number) => money(value, ledger.currency);
    const picked = share !== null;
    const keptShare = income > 0 ? kept / income : null;
    return (
        <>
            <span className="text-muted-foreground text-[13px] leading-5 whitespace-nowrap">
                {picked ? copy.spentOfIncome.shareOfSpent : null}
                {!picked && previewing ? copy.spentOfIncome.wouldKeep : null}
                {!picked && !previewing ? copy.kpi.kept : null}
            </span>
            <span
                className={`dash-figure font-medium whitespace-nowrap ${previewing ? "decoration-muted-foreground underline decoration-dashed underline-offset-3" : ""}`}
            >
                {shown(picked ? spent : kept)}
            </span>
            {picked ? (
                <Badge className={`${TREND_FLAT} max-[480px]:hidden`} size="sm" variant="secondary">
                    {Math.round((share ?? 0) * PERCENT)}%
                </Badge>
            ) : null}
            {keptShare === null || picked ? null : (
                <Badge
                    className={`${kept < 0 ? TREND_POOR : TREND_FLAT} max-[480px]:hidden`}
                    size="sm"
                    variant={kept < 0 ? "destructive" : "secondary"}
                >
                    {Math.round(keptShare * PERCENT)}%
                </Badge>
            )}
            <Button
                className={`[&_svg]:text-muted-foreground ml-auto gap-1.5 rounded-[6px] ${previewing ? "max-[480px]:hidden" : ""}`}
                nativeButton={false}
                render={<Link to="/app/insights" />}
                size="sm"
                variant="outline"
            >
                {copy.spentOfIncome.cashFlow}
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={1.5} />
            </Button>
        </>
    );
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
    const picked = useMemo(
        () =>
            filters.categories.length > 0
                ? categorySpend(ledger, period, { accounts: filters.accounts }, filters.categories)
                : null,
        [filters.accounts, filters.categories, ledger, period]
    );
    const income = figures.income.value;
    const spent = picked?.value ?? figures.spent.value;
    const prior = picked?.prior ?? figures.spent.prior;
    const delta = picked ? picked.delta : figures.spent.delta;
    const { amount: whatIf, slider } = useWhatIf(income);
    const shown = (value: number) => money(value, ledger.currency);
    const { title } = copy.spentOfIncome;
    if (setup && (income === 0 || spent === 0)) {
        return <SpentSetup spent={spent} />;
    }
    if (quiet) {
        return <SpentQuiet />;
    }
    const priorMonth = periodOf(shiftPeriodKey(period.key, -1), ledger.firstDayOfMonth).key;
    const hasIncome = income > 0;
    const over = hasIncome && spent > income;
    const previewing = whatIf !== null;
    const kept = previewing ? round(ledger, income - whatIf) : figures.kept.value;
    const overBy = over ? `${shown(round(ledger, spent - income))} ${copy.spentOfIncome.over.value}` : null;
    const realText = overBy ? `${shown(spent)}, ${overBy}` : shown(spent);
    const previewText = `${copy.spentOfIncome.whatIf.value} ${shown(whatIf ?? 0)}, ${copy.spentOfIncome.wouldKeep.value} ${shown(kept)}`;
    let tone = "";
    if (previewing) {
        tone = WHAT_IF_TONE;
    } else if (over || (!hasIncome && spent > 0)) {
        tone = OVER_TONE;
    }
    return (
        <CardFrame
            action={<SpentAction delta={delta} previewing={previewing} />}
            footer={
                <SpentFooter
                    income={income}
                    kept={kept}
                    previewing={previewing}
                    share={picked?.share ?? null}
                    spent={spent}
                />
            }
            title={title}
        >
            <div className="flex-1 px-4 pt-0.5 pb-3.5">
                <RangeMeter
                    aria-description={hasIncome && !picked ? copy.spentOfIncome.whatIfHint.value : undefined}
                    className={`dash-figure touch-pan-y [--pu-on-color:white] [&_[data-tag]]:shadow-none [&>[aria-hidden]]:h-16 ${tone}`}
                    formatValue={(value) =>
                        previewing ? `${copy.spentOfIncome.whatIfTag.value} ${shown(value)}` : shown(spent)
                    }
                    label={title.value}
                    marker={hasIncome ? prior : Number(prior > 0)}
                    max={hasIncome ? income : NO_INCOME_MAX}
                    value={whatIf ?? (hasIncome ? Math.min(spent, income) : Number(spent > 0))}
                    valueText={previewing ? previewText : realText}
                    style={categoryTone(
                        filters.category && !tone ? ledger.categories.get(filters.category)?.color : undefined
                    )}
                    {...(hasIncome && !picked ? slider : {})}
                />
                <RangeMeter.Scale
                    className="dash-figure mt-3.5 text-[13px]"
                    end={hasIncome ? shown(income) : copy.spentOfIncome.noIncome}
                    start={moneyIn(0, ledger.currency, "auto", false)}
                />
                <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 text-[13px] leading-5">
                        <u aria-hidden className="bg-foreground block size-[7px] rotate-45 rounded-[1px]" />
                        {capitalize(date.month(priorMonth))}
                    </span>
                    <span className="dash-figure ml-auto whitespace-nowrap">{shown(prior)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-[13px] leading-5">
                        {capitalize(date.month(period.key))}
                        {overBy ? <span className="text-app-spend">{overBy}</span> : null}
                    </span>
                    <span className="dash-figure ml-auto whitespace-nowrap">{shown(spent)}</span>
                </div>
            </div>
        </CardFrame>
    );
}
