import { Badge } from "panelui-web/badge";
import { useIntlayer } from "react-intlayer";

import { useCategoryName } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import { periodOf } from "@/lib/dashboard-series-period";

import type { Standout } from "../answers";
import { useInsightsFormat } from "../format";
import { Card, FIGURE, NOTE, OnwardButton, Track } from "../parts";
import type { SpanSpend } from "./model";

const PERCENT = 100;
const HEADROOM = 1.04;
const BARS_HEIGHT = 150;

export function SeeCategory({ categoryId, name }: { categoryId: string; name: string }) {
    const { see } = useIntlayer("dashboard-insights-overview");
    return (
        <OnwardButton category={categoryId} to="/insights/cash-flow">
            {see({ category: name })}
        </OnwardButton>
    );
}

function useCategory(categoryId: string) {
    const { ledger } = useDashboard();
    const name = useCategoryName();
    const category = ledger.categories.get(categoryId) ?? ledger.budgetTargets.get(categoryId);
    return {
        color: category?.color ?? NEUTRAL_COLOR,
        name: category ? name(category) : "",
    };
}

interface LimitBarsProps {
    color: string;
    history: readonly SpanSpend[];
    label: string;
    limit: number;
}

/** A category's last spans as bars, with its limit drawn across them. */
function LimitBars({ color, history, label, limit }: LimitBarsProps) {
    const { ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const top = Math.max(limit, ...history.map((each) => each.spent)) * HEADROOM;
    const share = (value: number) => (top > 0 ? (value / top) * PERCENT : 0);
    return (
        <div
            aria-label={label}
            className={`${FIGURE} relative max-w-[312px] text-[11px] leading-4`}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an img element cannot hold the drawn chart, so the container is named by role.
            role="img"
        >
            <div className="flex items-end gap-2.5 pt-4 pr-1.5 pl-[46px]" style={{ height: BARS_HEIGHT + 18 }}>
                {history.map((each, index) => {
                    const current = index === history.length - 1;
                    return (
                        <div
                            className="relative min-w-0 flex-1 rounded-sm"
                            key={each.key}
                            style={{
                                background: current ? color : `color-mix(in oklab, ${color} 42%, var(--color-card))`,
                                height: `${share(each.spent)}%`,
                                minHeight: each.spent > 0 ? 2 : 0,
                            }}
                        >
                            <span
                                className={`absolute inset-x-0 bottom-full mb-0.5 text-center ${current ? "" : "text-muted-foreground"}`}
                            >
                                {Math.round(each.spent)}
                            </span>
                        </div>
                    );
                })}
            </div>
            <div
                aria-hidden
                className="border-foreground absolute inset-x-0 border-t border-dashed"
                style={{ bottom: `calc(22px + ${(share(limit) / PERCENT) * BARS_HEIGHT}px)` }}
            >
                <span className="bg-foreground text-background absolute top-0 left-0 flex h-[18px] -translate-y-1/2 items-center rounded-sm px-1.5 font-semibold">
                    {fmt.whole(limit)}
                </span>
            </div>
            <div className="flex gap-2.5 pt-1.5 pr-1.5 pl-[46px]">
                {history.map((each, index) => (
                    <span
                        className={`min-w-0 flex-1 truncate text-center ${index === history.length - 1 ? "" : "text-muted-foreground"}`}
                        key={each.key}
                    >
                        {fmt.spanTick(periodOf(each.key, ledger.firstDayOfMonth))}
                    </span>
                ))}
            </div>
        </div>
    );
}

interface LimitCardProps {
    card: Extract<Standout, { kind: "overBudget" }>;
    className?: string;
    closed: boolean;
    history: readonly SpanSpend[];
}

export function LimitCard({ card, className, closed, history }: LimitCardProps) {
    const { ledger } = useDashboard();
    const { limit } = useIntlayer("dashboard-insights-overview");
    const fmt = useInsightsFormat(ledger);
    const { color, name } = useCategory(card.categoryId);
    const { biggest, budget } = card;
    const spent = fmt.amount(budget.spent);
    const note = () => {
        if (biggest === null) {
            return spent;
        }
        const values = { amount: fmt.amount(biggest.amount), date: fmt.date(biggest.day), spent };
        if (biggest.note === "") {
            return (closed ? limit.biggestUnnamedClosed : limit.biggestUnnamed)(values);
        }
        return (closed ? limit.biggestClosed : limit.biggest)({ ...values, name: biggest.note });
    };
    return (
        <Card
            action={
                <Badge dot variant="destructive">
                    {limit.over}
                </Badge>
            }
            className={className}
            footer={
                <span className="ml-auto">
                    <SeeCategory categoryId={card.categoryId} name={name} />
                </span>
            }
            panelClassName="px-4 pt-2 pb-4"
            statement={limit.statement({ category: name, limit: fmt.whole(budget.effectiveLimit) })}
        >
            <LimitBars
                color={color}
                history={history}
                label={limit.chart({ category: name }).value}
                limit={budget.effectiveLimit}
            />
            <p className={`${NOTE} mt-2.5`}>{note()}</p>
        </Card>
    );
}

interface VersusCardProps {
    card: Extract<Standout, { kind: "versus" }>;
    className?: string;
    closed: boolean;
    spanName: string;
    through: string;
}

export function VersusCard({ card, className, closed, spanName, through }: VersusCardProps) {
    const { ledger } = useDashboard();
    const { versus } = useIntlayer("dashboard-insights-overview");
    const fmt = useInsightsFormat(ledger);
    const { color, name } = useCategory(card.categoryId);
    const now = card.under ? card.usual - card.gap : card.usual + card.gap;
    const max = Math.max(now, card.usual);
    const values = { amount: fmt.whole(card.gap), category: name };
    const statement = () => {
        if (closed) {
            return (card.under ? versus.closedUnder : versus.closedOver)(values);
        }
        return (card.under ? versus.under : versus.over)(values);
    };
    return (
        <Card
            action={
                <Badge dot variant={card.under ? "success" : "destructive"}>
                    {card.under ? versus.below : versus.above}
                </Badge>
            }
            className={className}
            footer={
                <span className="ml-auto">
                    <SeeCategory categoryId={card.categoryId} name={name} />
                </span>
            }
            panelClassName="px-4 pt-[18px] pb-4"
            statement={statement()}
        >
            <div className="flex justify-between text-[13px] font-medium">
                <span>{spanName}</span>
                <span className={FIGURE}>{fmt.whole(now)}</span>
            </div>
            <Track className="bg-muted mt-1.5" color={color} max={max} value={now} />
            <div className="text-muted-foreground mt-4 flex justify-between text-[13px]">
                <span>{closed ? versus.usual : versus.usualBy({ date: fmt.date(through) })}</span>
                <span className={FIGURE}>{fmt.whole(card.usual)}</span>
            </div>
            <Track className="bg-muted mt-1.5" color="var(--color-app-strong)" max={max} value={card.usual} />
        </Card>
    );
}

export function QuietCard({ className }: { className?: string }) {
    const { quiet } = useIntlayer("dashboard-insights-overview");
    return (
        <Card className={className} panelClassName="dash-empty" title={quiet.title}>
            <p className={`${NOTE} max-w-80`}>{quiet.line}</p>
        </Card>
    );
}
