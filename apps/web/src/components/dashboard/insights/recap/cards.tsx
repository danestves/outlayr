import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import CheckmarkBadge01Icon from "@hugeicons/core-free-icons/CheckmarkBadge01Icon";
import SecurityCheckIcon from "@hugeicons/core-free-icons/SecurityCheckIcon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { Card, FIGURE, Swatch } from "../parts";
import type { CategoryRow, Recap } from "./model";

const PERCENT = 100;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface RecapFormat {
    amount: (value: number) => string;
    categoryName: (row: CategoryRow) => string;
    signed: (value: number) => string;
    weekday: (day: number) => string;
}

const toneOf = (delta: number) => {
    if (delta === 0) {
        return "flat";
    }
    return delta < 0 ? "good" : "poor";
};

const HEADING = "text-muted-foreground h-10 px-3 text-xs leading-4 font-medium first:ps-4 last:pe-4";
const BODY = "h-[46px] border-border border-t px-3 text-sm leading-5 first:ps-4 last:pe-4";
const MONO = "dash-figure whitespace-nowrap text-right font-normal";
const SHARE_COLUMN = "w-[214px]";
const MUTED_FIGURE = "text-muted-foreground text-[13px] leading-[17px]";

export function WhereItWent({ format, recap, versus }: { format: RecapFormat; recap: Recap; versus: string }) {
    const { where } = useIntlayer("dashboard-insights-recap");
    return (
        <Card
            action={
                <span className={`${FIGURE} ${MUTED_FIGURE} font-normal`}>
                    {where.categories({ count: String(recap.rows.length) })}
                </span>
            }
            className="xl:col-span-2"
            panelClassName="p-0"
            title={where.title}
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                    <thead>
                        <tr>
                            <th className={`${HEADING} text-left`}>{where.category}</th>
                            <th className={`${HEADING} text-left ${SHARE_COLUMN}`}>{where.share}</th>
                            <th className={`${HEADING} text-right`}>{where.ofSpending}</th>
                            <th className={`${HEADING} text-right`}>{where.spent}</th>
                            <th className={`${HEADING} text-right`}>{versus}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recap.rows.map((row) => (
                            <tr key={row.id}>
                                <td className={`${BODY} font-medium`}>
                                    <span className="inline-flex items-center gap-[9px]">
                                        <Swatch color={row.color} />
                                        {format.categoryName(row)}
                                    </span>
                                </td>
                                <td aria-hidden className={`${BODY} ${SHARE_COLUMN}`}>
                                    <span
                                        aria-hidden
                                        className="block h-2 w-[190px] overflow-hidden rounded-full"
                                        style={{ background: `color-mix(in oklab, ${row.color} 18%, transparent)` }}
                                    >
                                        <i
                                            className="block h-full rounded-full not-italic"
                                            style={{ background: row.color, width: `${row.share * PERCENT}%` }}
                                        />
                                    </span>
                                </td>
                                <td className={`${BODY} ${MONO} text-muted-foreground`}>
                                    {`${Math.round(row.share * PERCENT)}%`}
                                </td>
                                <td className={`${BODY} ${MONO}`}>{format.amount(row.amount)}</td>
                                <td className={`${BODY} text-right`}>
                                    <span className="dash-trend" data-tone={toneOf(row.delta)}>
                                        {row.delta === 0 ? "0" : format.signed(row.delta)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

export function Movers({ format, recap, versus }: { format: RecapFormat; recap: Recap; versus: string }) {
    const { movers } = useIntlayer("dashboard-insights-recap");
    const reach = Math.max(...recap.mostChange.map((row) => Math.abs(row.delta)), 0);
    return (
        <Card action={<span className={MUTED_FIGURE}>{versus}</span>} panelClassName="p-0" title={movers.title}>
            <ul>
                {recap.mostChange.map((row) => {
                    const width =
                        reach === 0 ? 0 : Math.max((Math.abs(row.delta) / reach) * 50, row.delta === 0 ? 0 : 2);
                    const down = row.delta < 0;
                    const tone = down ? "var(--color-app-income)" : "var(--color-app-spend)";
                    return (
                        <li
                            className="border-border grid h-[47px] grid-cols-[96px_1fr_58px] items-center gap-2 border-t px-5 text-[13px] first:border-t-0"
                            key={row.id}
                        >
                            <span className="truncate font-medium">{format.categoryName(row)}</span>
                            <span aria-hidden className="relative h-2">
                                <span className="bg-app-strong absolute inset-y-[-6px] left-1/2 w-px" />
                                {width === 0 ? null : (
                                    <span
                                        className="absolute inset-y-0 rounded-full"
                                        style={{
                                            background: tone,
                                            ...(down ? { right: "50%" } : { left: "50%" }),
                                            width: `${width}%`,
                                        }}
                                    />
                                )}
                            </span>
                            <span
                                className={`${FIGURE} text-right font-normal ${row.delta === 0 ? "text-muted-foreground" : ""}`}
                                style={row.delta === 0 ? undefined : { color: tone }}
                            >
                                {row.delta === 0 ? "0" : format.signed(row.delta)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

export function DaysLogged({ format, recap }: { format: RecapFormat; recap: Recap }) {
    const { days } = useIntlayer("dashboard-insights-recap");
    const logged = recap.days.filter((day) => day.logged).length;
    return (
        <Card
            action={
                <span className={`${FIGURE} ${MUTED_FIGURE} font-normal`}>
                    {days.logged({ logged: String(logged), total: String(recap.days.length) })}
                </span>
            }
            panelClassName="px-5 py-0"
            title={days.title}
        >
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                    <span
                        className={`${FIGURE} text-muted-foreground flex h-[18px] items-center justify-center text-[11px] leading-4 font-normal`}
                        key={day}
                    >
                        {format.weekday(day)}
                    </span>
                ))}
                {Array.from({ length: recap.lead }, (_, index) => (
                    <span key={`blank-${index}`} />
                ))}
                {recap.days.map(({ day, logged: done }) => (
                    <span
                        className={`${FIGURE} flex h-[39px] items-center justify-center rounded-lg text-[11px] leading-4 font-normal ${
                            done ? "text-foreground" : "bg-muted text-muted-foreground"
                        }`}
                        key={day}
                        style={
                            done
                                ? { background: "color-mix(in oklab, var(--color-app-tint) 26%, transparent)" }
                                : undefined
                        }
                    >
                        {String(Number(day.slice(8)))}
                    </span>
                ))}
            </div>
        </Card>
    );
}

interface CaughtLine {
    action?: ReactNode;
    icon: typeof SecurityCheckIcon;
    key: string;
    line: string;
    title: ReactNode;
    value?: string;
}

export function Caught({ lines }: { lines: readonly CaughtLine[] }) {
    const { caught } = useIntlayer("dashboard-insights-recap");
    return (
        <Card className="xl:col-span-2" panelClassName="p-0" title={caught.title}>
            {lines.length === 0 ? (
                <p className="text-muted-foreground p-6 text-[13px]">{caught.none}</p>
            ) : (
                <ul>
                    {lines.map((line) => (
                        <li
                            className="border-border flex h-[75px] items-center gap-3 border-t px-5 first:border-t-0"
                            key={line.key}
                        >
                            <span className="bg-muted text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-lg">
                                <Glyph icon={line.icon} size={14} />
                            </span>
                            <span className="min-w-0 flex-1 text-sm leading-5 font-medium">
                                {line.title}
                                <small className="text-muted-foreground block truncate text-xs leading-4 font-normal">
                                    {line.line}
                                </small>
                            </span>
                            {line.value ? (
                                <span
                                    className={`${FIGURE} text-[15px] leading-5 font-medium`}
                                    style={{ color: "var(--color-app-income)" }}
                                >
                                    {line.value}
                                </span>
                            ) : null}
                            {line.action}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

export type { CaughtLine };

export function BudgetsButton({ children }: { children: ReactNode }) {
    return (
        <Button className="h-8 px-3" render={<Link to="/app/settings/categories" />} size="sm" variant="outline">
            {children}
            <Glyph icon={ArrowUpRight01Icon} size={16} />
        </Button>
    );
}

export const CAUGHT_ICONS = {
    below: ArrowDown02Icon,
    over: AlertCircleIcon,
    pro: CheckmarkBadge01Icon,
    under: SecurityCheckIcon,
};

const GHOST = "border-app-ghost rounded-full border";

/** Outlines of the table and the calendar, behind the words of an empty month. */
export function RecapGhost() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-x-5 top-4 -z-10 flex gap-16 max-lg:hidden">
            <div className="flex flex-1 flex-col gap-3">
                {[80, 52, 40, 28, 36, 24].map((width) => (
                    <div className="flex flex-col gap-1.5" key={width}>
                        <div className="flex justify-between">
                            <span className={`${GHOST} h-2.5`} style={{ width: `${width}px` }} />
                            <span className={`${GHOST} h-2.5 w-20`} />
                        </div>
                        <span className={`${GHOST} h-2.5 w-full`} />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-6 content-start gap-2.5 pt-1">
                {Array.from({ length: 30 }, (_, index) => (
                    <span className="border-app-ghost size-[35px] rounded-md border" key={index} />
                ))}
            </div>
        </div>
    );
}
