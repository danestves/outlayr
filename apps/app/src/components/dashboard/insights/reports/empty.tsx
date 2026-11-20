import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import ChartHistogramIcon from "@hugeicons/core-free-icons/ChartHistogramIcon";
import File01Icon from "@hugeicons/core-free-icons/File01Icon";
import { Button } from "panelui-web/button";
import type { ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { Empty } from "@/components/dashboard/home/empty";

import { Tray } from "../parts";
import type { Definition } from "./model";
import { searchOf } from "./search";
import type { ReportsPatch } from "./search";
import { dimensionIcon } from "./toolbar";
import type { ReportWords } from "./words";

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
        <Tray className="min-h-214 flex-1">
            <div className="bg-card rounded-app-xl flex flex-1 flex-col">
                <Empty
                    action={
                        <div className="flex flex-col items-center gap-7.5">
                            <Button onClick={onNew}>
                                <Glyph icon={Add01Icon} size={16} />
                                {empty.newReport}
                            </Button>
                            <ul className="grid w-full max-w-199 list-none grid-cols-1 gap-2 p-0 sm:grid-cols-3">
                                {templates.map((template) => (
                                    <li key={template.name}>
                                        <Button
                                            className="rounded-app-lg h-auto w-full justify-start gap-2.5 p-3 text-start"
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
                                            variant="outline"
                                        >
                                            <span className="bg-muted text-muted-foreground rounded-app-sm grid size-6.5 shrink-0 place-items-center">
                                                <Glyph icon={dimensionIcon(template.definition.rows)} size={14} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="text-app-label block truncate font-medium">
                                                    {template.name}
                                                </span>
                                                <span className="text-muted-foreground text-app-caption block truncate font-normal">
                                                    {template.caption}
                                                </span>
                                            </span>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    }
                    icon={File01Icon}
                    line={empty.body}
                    title={empty.title}
                />
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
        <div className="flex min-h-170 flex-col">
            <table className="w-full">
                <thead>
                    <tr>
                        <th className="text-muted-foreground text-app-caption h-10 px-3.5 text-start font-medium first:ps-5">
                            {corner}
                        </th>
                        {columns.map((column, index) => (
                            <th
                                className={`text-muted-foreground text-app-caption h-10 px-3.5 font-medium last:pe-3.5 ${
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
            <Empty
                action={
                    <Button onClick={onClear}>
                        <Glyph icon={Cancel01Icon} size={16} />
                        {noData.clear}
                    </Button>
                }
                icon={ChartHistogramIcon}
                line={body}
                title={noData.title}
            />
        </div>
    );
}
