import RefreshIcon from "@hugeicons/core-free-icons/RefreshIcon";
import { HugeiconsIcon } from "@hugeicons/react";

import { useReplica } from "./canvas";
import { formatDayTitle, formatTime } from "./dates";
import { categoryStyle } from "./ledger";
import type { DaySection, DemoRow } from "./ledger";
import { formatAmount, formatDayTotal } from "./money";
import { CategoryIconTile } from "./tile";

const BADGE_OFFSET = -5;

export function TransactionRow({ row }: { row: DemoRow }) {
    const { ledger, locale, t } = useReplica();
    const identity = categoryStyle(row.category);
    return (
        <div className="bg-background flex-row items-center gap-3 py-1.5">
            <div>
                <CategoryIconTile
                    color={ledger.imageColor(row.logo) ?? identity.color}
                    icon={identity.icon}
                    logo={row.logo}
                    radius={10}
                    size={32}
                />
                {row.recurringType > 0 ? (
                    <div
                        className="bg-surface-secondary text-foreground absolute rounded-md"
                        style={{ bottom: BADGE_OFFSET, padding: 3, right: BADGE_OFFSET }}
                    >
                        <HugeiconsIcon icon={RefreshIcon} size={12} strokeWidth={2} />
                    </div>
                ) : null}
            </div>
            <div className="flex-1">
                <div className="flex-row items-center gap-1.5">
                    <span className="font-sans-medium text-subtitle text-foreground shrink truncate leading-5">
                        {row.note}
                    </span>
                </div>
                <div className="flex-row flex-wrap items-center gap-1.25">
                    <span className="font-sans-medium text-label text-muted truncate">
                        {formatTime(row.date, locale, t)}
                    </span>
                </div>
            </div>
            <div className="items-end">
                <span
                    className={`font-sans-semibold text-subtitle tabular-nums ${row.income ? "text-income" : "text-foreground"}`}
                >
                    {`${row.income ? "+" : "-"}${formatAmount(row.amount, row.currency, locale)}`}
                </span>
            </div>
        </div>
    );
}

export function RowHairline() {
    return <div className="bg-border ml-11 h-px" />;
}

export function DaySectionHeader({ first, now, section }: { first: boolean; now: Date; section: DaySection }) {
    const { ledger, locale, t } = useReplica();
    return (
        <div className={`gap-1.5 ${first ? "pt-2.5" : "pt-6"}`}>
            <div className="flex-row items-baseline justify-between gap-2">
                <span className="text-muted text-footnote truncate font-sans">
                    {formatDayTitle(section.day, now, locale, t)}
                </span>
                <div className="flex-row items-baseline gap-1.5">
                    <span className="font-sans-semibold text-muted text-footnote tabular-nums">
                        {formatDayTotal(section.total, ledger.currency, locale)}
                    </span>
                </div>
            </div>
            <div className="bg-border h-px" />
        </div>
    );
}

export function DayList({ now, sections }: { now: Date; sections: readonly DaySection[] }) {
    return sections.map((section, index) => (
        <div key={section.day.getTime()}>
            <DaySectionHeader first={index === 0} now={now} section={section} />
            {section.rows.map((row, rowIndex) => (
                <div key={row.id}>
                    {rowIndex > 0 ? <RowHairline /> : null}
                    <TransactionRow row={row} />
                </div>
            ))}
        </div>
    ));
}
