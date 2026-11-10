import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Download04Icon from "@hugeicons/core-free-icons/Download04Icon";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import { PANEL, TRAY } from "./card";
import { monthsIn, spanOf } from "./model";
import type { SavedReport } from "./store";
import { dimensionIcon } from "./toolbar";
import type { ReportWords } from "./words";

export interface ReportActions {
    duplicate: (id: string) => void;
    export: (id: string) => void;
    open: (id: string) => void;
    remove: (id: string) => void;
    rename: (id: string) => void;
}

export function RowMenu({
    actions,
    className = "",
    report,
    words,
}: {
    actions: ReportActions;
    className?: string;
    report: SavedReport;
    words: ReportWords;
}) {
    const { rowMenu } = words.copy;
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        aria-label={rowMenu.more({ name: report.name }).value}
                        className={className}
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                <Glyph icon={MoreVerticalIcon} size={16} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[220px]" sideOffset={4}>
                <Menu.Item onClick={() => actions.open(report.id)}>
                    <Glyph icon={LinkSquare02Icon} size={16} />
                    {rowMenu.open}
                </Menu.Item>
                <Menu.Item onClick={() => actions.rename(report.id)}>
                    <Glyph icon={PencilEdit01Icon} size={16} />
                    {rowMenu.rename}
                </Menu.Item>
                <Menu.Item onClick={() => actions.duplicate(report.id)}>
                    <Glyph icon={Copy01Icon} size={16} />
                    {rowMenu.duplicate}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => actions.export(report.id)}>
                    <Glyph icon={Download04Icon} size={16} />
                    {rowMenu.export}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => actions.remove(report.id)} variant="destructive">
                    <Glyph icon={Delete02Icon} size={16} />
                    {rowMenu.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

/** "6 mo" for a rolling or short range, "Year" for a whole calendar year. */
export function rangeTag(report: SavedReport, currentKey: string, words: ReportWords) {
    const { range } = report.definition;
    const { saved } = words.copy;
    const wholeYear =
        "from" in range &&
        range.from.endsWith("-01") &&
        range.to.endsWith("-12") &&
        range.from.slice(0, 4) === range.to.slice(0, 4);
    return wholeYear ? saved.year.value : saved.months({ count: String(monthsIn(spanOf(range, currentKey))) }).value;
}

interface SavedListProps {
    actions: ReportActions;
    activeId: string | undefined;
    currentKey: string;
    onAll: () => void;
    reports: readonly SavedReport[];
    words: ReportWords;
}

export function SavedList({ actions, activeId, currentKey, onAll, reports, words }: SavedListProps) {
    const { saved } = words.copy;
    return (
        <aside className={`${TRAY} self-stretch max-lg:hidden`}>
            <h2 className="text-muted-foreground min-h-[42px] px-4 pt-2.5 pb-3 text-sm leading-5 font-medium">
                {saved.title}
            </h2>
            <div className={PANEL}>
                {reports.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">{saved.none}</p>
                ) : (
                    <ul className="m-0 flex list-none flex-col px-2 py-1">
                        {reports.map((report) => (
                            <li className="group relative" key={report.id}>
                                <button
                                    aria-current={report.id === activeId ? "true" : undefined}
                                    className="text-muted-foreground hover:bg-muted/60 aria-[current=true]:bg-muted aria-[current=true]:text-foreground focus-visible:ring-ring flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-start text-[13px] font-medium outline-none focus-visible:ring-2"
                                    onClick={() => actions.open(report.id)}
                                    type="button"
                                >
                                    <Glyph
                                        className={report.id === activeId ? "text-app-tint" : ""}
                                        icon={dimensionIcon(report.definition.rows)}
                                        size={15}
                                    />
                                    <span className="min-w-0 flex-1 truncate">{report.name}</span>
                                    {report.id === activeId ? null : (
                                        <span className="dash-figure text-[11px] leading-4 font-normal group-focus-within:invisible group-hover:invisible">
                                            {rangeTag(report, currentKey, words)}
                                        </span>
                                    )}
                                </button>
                                <RowMenu
                                    actions={actions}
                                    className="absolute top-1.5 right-1.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 data-[popup-open]:opacity-100"
                                    report={report}
                                    words={words}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="bg-card flex flex-1 flex-col justify-end">
                <div className="p-2">
                    <Button className="w-full justify-start" onClick={onAll} size="sm" variant="ghost">
                        {saved.all}
                    </Button>
                </div>
            </div>
        </aside>
    );
}
