import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";
import { SkeletonBox } from "skullet/react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile, MerchantTile } from "@/components/ledger/tiles";

import { useInsightsFormat } from "../format";
import { Bones, Card, FIGURE, NOTE, OnwardButton, ROW, Swatch, Tray, onwardSearch } from "../parts";
import type { Onward } from "../parts";
import type { HistorySlot, Subscriptions } from "./model";

const SHOWN_CHARGES = 4;
const SHOWN_CATEGORIES = 6;

export function SubscriptionsCard({ className, subscriptions }: { className?: string; subscriptions: Subscriptions }) {
    const { ledger, photos } = useDashboard();
    const copy = useIntlayer("dashboard-insights-overview").subscriptions;
    const fmt = useInsightsFormat(ledger);
    const { charges, next, perMonth, perYear } = subscriptions;
    const amount = fmt.amount(perMonth);
    return (
        <Card
            className={className}
            footer={
                <>
                    <span className="text-muted-foreground min-w-0 flex-1 text-xs leading-4">
                        {next
                            ? copy.foot({
                                  amount: fmt.whole(perYear),
                                  date: fmt.date(next.nextCharge),
                                  name: next.note,
                              })
                            : null}
                    </span>
                    <OnwardButton to="/app/transactions">{copy.seeAll}</OnwardButton>
                </>
            }
            panelClassName="px-4 pt-1.5"
            statement={
                charges.length === 1 ? copy.one({ amount }) : copy.statement({ amount, count: String(charges.length) })
            }
        >
            {charges.slice(0, SHOWN_CHARGES).map((charge) => (
                <div className={ROW} key={charge.id}>
                    {charge.look.icon || charge.look.emoji ? (
                        <LookTile look={charge.look} photos={photos} plain size="lg" />
                    ) : (
                        <MerchantTile
                            imageUrl={charge.look.imageKey ? photos.get(charge.look.imageKey) : undefined}
                            name={charge.note}
                            size="lg"
                        />
                    )}
                    <span className="min-w-0 truncate">{charge.note}</span>
                    <span className={`${FIGURE} ml-auto`}>{fmt.amount(charge.perMonth)}</span>
                </div>
            ))}
        </Card>
    );
}

export interface WhereRow {
    color: string;
    id: string;
    label: string;
    value: number;
}

export function WhereCard({ className, rows }: { className?: string; rows: readonly WhereRow[] }) {
    const { ledger } = useDashboard();
    const { where } = useIntlayer("dashboard-insights-overview");
    const fmt = useInsightsFormat(ledger);
    return (
        <Card
            action={<OnwardButton to="/app/insights/breakdown">{where.breakdown}</OnwardButton>}
            className={className}
            panelClassName="px-4 pb-1.5"
            title={where.title}
        >
            {rows.slice(0, SHOWN_CATEGORIES).map((row) => (
                <div className={ROW} key={row.id}>
                    <Swatch color={row.color} />
                    <span className="min-w-0 truncate">{row.label}</span>
                    <span className={`${FIGURE} ml-auto font-normal`}>{fmt.amount(row.value)}</span>
                </div>
            ))}
        </Card>
    );
}

const ELSE_ROW =
    "hover:bg-muted/60 focus-visible:bg-muted/60 after:border-border relative -mx-4 flex h-[43px] items-center gap-2.5 px-4 text-[13px] font-medium outline-none after:absolute after:inset-x-4 after:top-0 after:border-t first:after:hidden";

function ElseRow({ children, to, value }: { children: ReactNode; to: Onward; value?: ReactNode }) {
    return (
        <Link className={ELSE_ROW} search={onwardSearch(to)} to={to}>
            <span className="min-w-0 truncate">{children}</span>
            <span className={`${FIGURE} text-muted-foreground ml-auto font-normal whitespace-nowrap`}>{value}</span>
            <Glyph className="text-muted-foreground shrink-0" icon={ArrowRight01Icon} size={16} />
        </Link>
    );
}

interface ElseCardProps {
    byDay: number;
    categories: number;
    className?: string;
    kept: number | null;
    netWorth: number;
    year: string;
}

export function ElseCard({ byDay, categories, className, kept, netWorth, year }: ElseCardProps) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights-overview").else;
    const fmt = useInsightsFormat(ledger);
    return (
        <Card className={className} panelClassName="px-4 pb-2" title={copy.title}>
            <ElseRow to="/app/insights/breakdown" value={categories}>
                {copy.allCategories}
            </ElseRow>
            {kept === null ? null : (
                <ElseRow to="/app/insights/cash-flow" value={fmt.signed(kept)}>
                    {copy.incomeAndNet}
                </ElseRow>
            )}
            <ElseRow to="/app/transactions" value={copy.perDay({ amount: fmt.amount(byDay) })}>
                {copy.byDay}
            </ElseRow>
            <ElseRow to="/app/accounts/net-worth" value={fmt.amount(netWorth)}>
                {copy.netWorth}
            </ElseRow>
            <ElseRow to="/app/insights/year">{copy.plan({ year })}</ElseRow>
        </Card>
    );
}

const BONE_BARS = ["72%", "80%", "76%", "84%", "88%"];

/** The answer slot while the ledger loads: which answer it holds is not known yet, so it has one fixed shape. */
export function AnswerBones() {
    return (
        <Card
            panelClassName="px-4 pt-4 pb-4"
            statement={
                <Bones>
                    <SkeletonBox height={14} width={220} />
                </Bones>
            }
        >
            <Bones>
                <span className="flex h-[200px] items-end gap-2.5">
                    {BONE_BARS.map((height) => (
                        <SkeletonBox className="flex-1" height={height} key={height} />
                    ))}
                </span>
                <SkeletonBox className="mt-5" height={12} width="100%" />
                <SkeletonBox className="mt-2.5" height={12} width="60%" />
            </Bones>
        </Card>
    );
}

const GHOST =
    "M20 183.1L31.5 180.1L43 183.7L54.6 176.9L66.1 179.4L77.6 178.4L89.1 173.3L100.6 166.4L112.1 163.8L123.7 159.9L135.2 157.9L146.7 151.8L158.2 153.9L169.7 149.9L181.2 147.1L192.8 146L204.3 145.4L215.8 150.4L227.3 148L238.8 147.4L250.3 144.3L261.9 143.4L273.4 136.3L284.9 132.4L296.4 128.9L307.9 131.1L319.4 130.7L331 123.2L342.5 123.7L354 126.6";
const GHOST_RULES = [14, 78.3, 142.7, 207];

interface HistoryCardProps {
    className?: string;
    line: ReactNode;
    slots: readonly HistorySlot[];
}

/** What stands in for the answers while the ledger is younger than a usual needs. */
export function HistoryCard({ className = "", line, slots }: HistoryCardProps) {
    const { ledger } = useDashboard();
    const { history } = useIntlayer("dashboard-insights-overview");
    const fmt = useInsightsFormat(ledger);
    return (
        <Tray className={`relative isolate ${className}`}>
            <svg
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-auto w-full [mask-image:linear-gradient(#000_36%,transparent_52%)]"
                fill="none"
                viewBox="0 0 374 386"
            >
                {GHOST_RULES.map((y) => (
                    <path d={`M20 ${y}H354`} key={y} stroke="var(--color-app-strong)" />
                ))}
                <path d={GHOST} stroke="var(--color-app-ghost)" strokeDasharray="3 4" strokeWidth={1.4} />
            </svg>
            <div className="flex flex-1 flex-col items-center justify-end gap-1.5 px-5 pt-6 pb-7 text-center">
                <b className="text-[15px] font-semibold">{history.title}</b>
                <p className={`${NOTE} mb-2.5 max-w-80`}>{line}</p>
                <div className="mt-1.5 grid w-full grid-cols-3 gap-2">
                    {slots.map((slot) => (
                        <div
                            className={`flex h-16 min-w-0 flex-col items-center justify-center rounded-[10px] text-xs ${
                                slot.started
                                    ? "bg-[color-mix(in_oklab,var(--color-app-tint)_22%,transparent)] font-medium"
                                    : "text-muted-foreground border border-dashed border-(--color-app-strong)"
                            }`}
                            key={slot.span.key}
                        >
                            {fmt.spanTick(slot.span)}
                            {slot.started ? (
                                <small className={`${FIGURE} text-[11px] leading-4 font-normal`}>
                                    {slot.entries === 1
                                        ? history.entry
                                        : history.entries({ count: String(slot.entries) })}
                                </small>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </Tray>
    );
}
