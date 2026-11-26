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
import { viewTransition } from "@/lib/motion";

import { Card, FIGURE, Pill, Swatch, toneOf } from "../parts";
import type { CategoryRow, Recap } from "./model";

const PERCENT = 100;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface RecapFormat {
    amount: (value: number) => string;
    categoryName: (row: CategoryRow) => string;
    signed: (value: number) => string;
    weekday: (day: number) => string;
}

const HEADING = "text-muted-foreground h-10 px-3 text-app-caption font-medium first:ps-4 last:pe-4";
const BODY = "h-11.5 border-border border-t px-3 text-app-body first:ps-4 last:pe-4";
const MONO = "dash-figure whitespace-nowrap text-right font-normal";
const SHARE_COLUMN = "w-53.5";
const MUTED_FIGURE = "text-muted-foreground text-app-label leading-4.25";

export function WhereItWent({ format, recap, versus }: { format: RecapFormat; recap: Recap; versus: string }) {
    const { where } = useIntlayer("dashboard-insights-recap");
    return (
        <Card
            action={
                <span className={`${FIGURE} ${MUTED_FIGURE} font-normal`}>
                    {where.categories({ count: recap.rows.length })}
                </span>
            }
            className="xl:col-span-2"
            panelClassName="p-0"
            title={where.title}
        >
            <div className="overflow-x-auto">
                <table className="w-full min-w-160 border-collapse">
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
                                    <span className="inline-flex items-center gap-2.25">
                                        <Swatch color={row.color} />
                                        {format.categoryName(row)}
                                    </span>
                                </td>
                                <td aria-hidden className={`${BODY} ${SHARE_COLUMN}`}>
                                    <span
                                        aria-hidden
                                        className="block h-2 w-47.5 overflow-hidden rounded-full"
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
                                    <Pill tone={toneOf(row.delta, "down")}>
                                        {row.delta === 0 ? "0" : format.signed(row.delta)}
                                    </Pill>
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
                            className="border-border text-app-label grid h-11.75 grid-cols-[96px_1fr_58px] items-center gap-2 border-t px-5 first:border-t-0"
                            key={row.id}
                        >
                            <span className="truncate font-medium">{format.categoryName(row)}</span>
                            <span aria-hidden className="relative h-2">
                                <span className="bg-app-strong absolute -inset-y-1.5 left-1/2 w-px" />
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
                        className={`${FIGURE} text-muted-foreground text-app-micro flex h-4.5 items-center justify-center leading-4 font-normal`}
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
                        className={`${FIGURE} rounded-app-sm text-app-micro flex h-9.75 items-center justify-center leading-4 font-normal ${
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
                <p className="text-muted-foreground text-app-label p-6">{caught.none}</p>
            ) : (
                <ul>
                    {lines.map((line) => (
                        <li
                            className="border-border flex h-18.75 items-center gap-3 border-t px-5 first:border-t-0"
                            key={line.key}
                        >
                            <span className="bg-muted text-muted-foreground rounded-app-sm flex size-6.5 shrink-0 items-center justify-center">
                                <Glyph icon={line.icon} size={14} />
                            </span>
                            <span className="text-app-body min-w-0 flex-1 font-medium">
                                {line.title}
                                <small className="text-muted-foreground text-app-caption block truncate font-normal">
                                    {line.line}
                                </small>
                            </span>
                            {line.value ? (
                                <span
                                    className={`${FIGURE} text-app-title leading-5 font-medium`}
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
        <Button
            className="h-8 px-3"
            render={<Link viewTransition={viewTransition("push-left")} to="/settings/categories" />}
            size="sm"
            variant="outline"
        >
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
