import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import { Button } from "panelui-web/button";
import type { ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { Tray } from "../parts";
import type { Definition } from "./model";
import { searchOf } from "./search";
import type { ReportsPatch } from "./search";
import { dimensionIcon } from "./toolbar";
import type { ReportWords } from "./words";

const GHOST_ROWS = 9;
const LINE_WIDTHS = [58, 71, 64, 82, 68, 76, 60, 88, 66] as const;
const SHARES = [0.52, 0.38, 0.62, 0.46, 0.7, 0.4, 0.56, 0.5, 0.64] as const;

const BAR = "bg-app-ghost block h-2 rounded-full";

/** Rows of grey strokes standing where a report's table would be. */
export function Ghost({ columns }: { columns: number }) {
    return (
        <div aria-hidden>
            {Array.from({ length: GHOST_ROWS }, (_, row) => (
                <div
                    className="border-border grid h-[42px] items-center gap-6 border-t px-5"
                    key={LINE_WIDTHS[row]}
                    style={{ gridTemplateColumns: `1fr 2.6fr repeat(${columns}, 1fr)`, opacity: 1 - row * 0.09 }}
                >
                    <span className={BAR} style={{ width: `${LINE_WIDTHS[row] ?? 60}%` }} />
                    <span className={BAR} style={{ width: `${(SHARES[row] ?? 0.5) * 100}%` }} />
                    {Array.from({ length: columns }, (_cell, column) => (
                        <span
                            className={`${BAR} justify-self-end`}
                            key={column}
                            style={{ width: `${40 + ((row * 7 + column * 13) % 45)}%` }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

interface Template {
    caption: string;
    definition: Pick<Definition, "columns" | "range" | "rows">;
    name: string;
}

interface LandingProps {
    currentKey: string;
    onBuild: (patch: ReportsPatch) => void;
    onNew: () => void;
    words: ReportWords;
}

export function Landing({ currentKey, onBuild, onNew, words }: LandingProps) {
    const { empty } = words.copy;
    const year = currentKey.slice(0, 4);
    const thisYear = { from: `${year}-01`, to: currentKey };
    const templates: Template[] = [
        {
            caption: empty.templates.sixMonths.value,
            definition: { columns: "month", range: { last: 6 }, rows: "category" },
            name: empty.templates.monthByCategory.value,
        },
        {
            caption: empty.templates.thisYear.value,
            definition: { columns: "none", range: thisYear, rows: "merchant" },
            name: empty.templates.merchants.value,
        },
        {
            caption: empty.templates.thisYear.value,
            definition: { columns: "quarter", range: thisYear, rows: "tag" },
            name: empty.templates.tagsByQuarter.value,
        },
    ];
    return (
        <Tray className="min-h-[856px] flex-1">
            <div className="bg-card relative flex-1 overflow-hidden rounded-xl">
                <div className="absolute inset-x-0 top-0">
                    <Ghost columns={4} />
                </div>
                <div className="relative mx-auto flex flex-col items-center px-6 pt-[450px] pb-12 text-center">
                    <h2 className="text-[15px] font-semibold">{empty.title}</h2>
                    <p className="text-muted-foreground mt-1.5 max-w-[320px] text-[13px] leading-5">{empty.body}</p>
                    <Button className="mt-4" onClick={onNew}>
                        <Glyph icon={Add01Icon} size={16} />
                        {empty.newReport}
                    </Button>
                    <ul className="mt-[30px] grid w-full max-w-[796px] list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
                        {templates.map((template) => (
                            <li key={template.name}>
                                <button
                                    className="border-border hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-2.5 rounded-xl border p-3 text-start outline-none focus-visible:ring-2"
                                    onClick={() =>
                                        onBuild(
                                            searchOf({
                                                ...template.definition,
                                                accounts: [],
                                                measure: "spending",
                                                tags: [],
                                            })
                                        )
                                    }
                                    type="button"
                                >
                                    <span className="bg-muted text-muted-foreground grid size-[26px] shrink-0 place-items-center rounded-lg">
                                        <Glyph icon={dimensionIcon(template.definition.rows)} size={14} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-medium">{template.name}</span>
                                        <span className="text-muted-foreground block truncate text-xs">
                                            {template.caption}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </Tray>
    );
}

interface NoDataProps {
    body: string;
    children?: ReactNode;
    columns: readonly string[];
    corner: string;
    onClear: () => void;
    words: ReportWords;
}

export function NoData({ body, columns, corner, onClear, words }: NoDataProps) {
    const { noData } = words.copy;
    return (
        <div>
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="text-muted-foreground h-10 px-3.5 text-start text-xs font-medium first:ps-5">
                            {corner}
                        </th>
                        {columns.map((column, index) => (
                            <th
                                className={`text-muted-foreground h-10 px-3.5 text-xs font-medium last:pe-3.5 ${
                                    index === columns.length - 1 && columns.length > 1 ? "text-start" : "text-end"
                                }`}
                                key={column}
                            >
                                {column}
                            </th>
                        ))}
                    </tr>
                </thead>
            </table>
            <div className="relative min-h-[680px] overflow-hidden">
                <div className="absolute inset-x-0 top-0">
                    <Ghost columns={columns.length} />
                </div>
                <div className="relative flex flex-col items-center px-6 pt-[353px] text-center">
                    <h2 className="text-[15px] font-semibold">{noData.title}</h2>
                    <p className="text-muted-foreground mt-1.5 max-w-[300px] text-[13px] leading-5">{body}</p>
                    <Button className="mt-4" onClick={onClear}>
                        <Glyph icon={Cancel01Icon} size={16} />
                        {noData.clear}
                    </Button>
                </div>
            </div>
        </div>
    );
}
