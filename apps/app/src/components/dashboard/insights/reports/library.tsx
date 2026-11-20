import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useDeferredValue, useMemo, useState } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { MenuContent } from "@/components/ui/menu-content";

import { BADGE } from "../parts";
import type { SharedLink } from "./links";
import { buildReport, spanOf } from "./model";
import { RowMenu } from "./saved";
import type { ReportActions } from "./saved";
import type { SavedReport } from "./store";
import { dimensionIcon } from "./toolbar";
import type { ReportWords } from "./words";

const HEAD = "text-muted-foreground h-10 px-3 text-app-caption font-medium first:ps-4 last:pe-4";
const CELL = "h-14.25 px-3 py-0 text-app-body first:ps-4 last:pe-4";
const CHIP =
    "data-[popup-open]:bg-muted data-[popup-open]:border-app-strong h-8 gap-1.5 rounded-full px-3 text-app-label font-medium";
const CHIP_ON = "border-app-tint/40 bg-app-count text-app-on-count";
const SHARING = ["all", "shared", "private"] as const;

type Sharing = (typeof SHARING)[number];

interface LibraryProps {
    actions: ReportActions;
    books: Parameters<typeof buildReport>[0]["books"];
    currentKey: string;
    ledger: Parameters<typeof buildReport>[0]["ledger"];
    links: readonly SharedLink[];
    now: number;
    /** Turns off the links whose reports are not saved in this browser. */
    onForget: (reportIds: readonly string[]) => void;
    reports: readonly SavedReport[];
    words: ReportWords;
}

export function Library({ actions, books, currentKey, ledger, links, now, onForget, reports, words }: LibraryProps) {
    const { copy, fmt } = words;
    const [query, setQuery] = useState("");
    const [sharing, setSharing] = useState<Sharing>("all");
    const shared = new Set(links.map((link) => link.reportId));
    const elsewhere = links.filter((link) => !reports.some((report) => report.id === link.reportId));
    const sharingNames = {
        all: copy.library.sharing.all,
        private: copy.library.sharing.private,
        shared: copy.library.sharing.linkOn,
    };
    const needle = useDeferredValue(query.trim().toLocaleLowerCase());
    const totals = useMemo(
        () =>
            new Map(
                reports.map((report) => {
                    const { measure } = report.definition;
                    const { total } = buildReport({ books, definition: report.definition, ledger }).totals;
                    return [report.id, words.measureValue(measure, total)] as const;
                })
            ),
        [books, ledger, reports, words]
    );
    const shown = reports
        .filter((report) => report.name.toLocaleLowerCase().includes(needle))
        .filter((report) => sharing === "all" || shared.has(report.id) === (sharing === "shared"))
        .toSorted((a, b) => b.openedAt - a.openedAt);
    const opened = (at: number) => {
        const day = new Date(at).toDateString();
        return day === new Date(now).toDateString()
            ? copy.library.today.value
            : fmt.date(new Date(at).toISOString().slice(0, 10));
    };
    const rangeOf = (report: SavedReport) => {
        const { range } = report.definition;
        if ("last" in range) {
            return copy.range.last({ count: String(range.last) }).value;
        }
        const span = spanOf(range, currentKey);
        const wholeYear =
            span.from.endsWith("-01") && span.to.endsWith("-12") && span.from.slice(0, 4) === span.to.slice(0, 4);
        return wholeYear ? span.from.slice(0, 4) : words.rangeName(span);
    };
    return (
        <div className="flex flex-1 flex-col">
            <div className="flex h-15 shrink-0 items-center gap-2">
                <label className="border-input bg-input/30 text-muted-foreground text-app-label flex h-8 w-75 max-w-full items-center gap-2 rounded-full border px-3">
                    <Glyph icon={Search01Icon} size={16} />
                    <input
                        aria-label={copy.library.search.value}
                        className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={copy.library.search.value}
                        value={query}
                    />
                </label>
                <Menu>
                    <Menu.Trigger
                        render={<Button className={`${CHIP} ${sharing === "all" ? "" : CHIP_ON}`} variant="outline" />}
                    >
                        <Glyph
                            className={sharing === "all" ? "text-muted-foreground" : ""}
                            icon={Link01Icon}
                            size={14}
                        />
                        {sharing === "private" ? copy.library.sharing.private : copy.library.sharing.filter}
                        <Glyph
                            className={sharing === "all" ? "text-muted-foreground" : ""}
                            icon={ArrowDown01Icon}
                            size={14}
                        />
                    </Menu.Trigger>
                    <MenuContent align="start" className="w-60" sideOffset={6}>
                        <Menu.RadioGroup
                            onValueChange={(next) => setSharing(SHARING.find((each) => each === next) ?? "all")}
                            value={sharing}
                        >
                            {SHARING.map((each) => (
                                <Menu.RadioItem
                                    className="data-[checked]:bg-muted [&_svg]:text-app-tint"
                                    closeOnClick
                                    key={each}
                                    value={each}
                                >
                                    {sharingNames[each]}
                                </Menu.RadioItem>
                            ))}
                        </Menu.RadioGroup>
                    </MenuContent>
                </Menu>
                <span className="dash-figure text-muted-foreground text-app-label ms-auto">
                    {reports.length === 1
                        ? copy.library.countOne
                        : copy.library.count({ count: String(reports.length) })}
                </span>
            </div>
            <section className="bg-card border-border rounded-app-3xl flex min-w-0 flex-none flex-col overflow-hidden border">
                {shown.length === 0 ? (
                    <p className="text-muted-foreground text-app-label px-5 py-8 text-center">
                        {needle === "" && sharing !== "all" ? copy.library.sharing.none : copy.library.noMatch}
                    </p>
                ) : (
                    <Table containerClassName="overflow-x-auto" maxHeight="none">
                        <Table.Header>
                            <Table.Row>
                                <Table.Head className={HEAD}>{copy.library.columns.report}</Table.Head>
                                <Table.Head className={HEAD}>{copy.library.columns.rowsByColumns}</Table.Head>
                                <Table.Head className={HEAD}>{copy.library.columns.measure}</Table.Head>
                                <Table.Head className={HEAD}>{copy.library.columns.range}</Table.Head>
                                <Table.Head align="end" className={HEAD}>
                                    {copy.library.columns.total}
                                </Table.Head>
                                <Table.Head className={HEAD}>{copy.library.columns.sharing}</Table.Head>
                                <Table.Head className={HEAD}>{copy.library.columns.opened}</Table.Head>
                                <Table.Head className={`${HEAD} w-14`}>
                                    <span className="sr-only">{copy.rowMenu.open}</span>
                                </Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {shown.map((report) => (
                                <Table.Row
                                    className="hover:bg-app-hover has-[[data-popup-open]]:bg-app-hover"
                                    key={report.id}
                                >
                                    <Table.Cell className={CELL}>
                                        <button
                                            className="focus-visible:ring-ring flex items-center gap-2.5 rounded-sm text-start font-medium outline-none hover:underline focus-visible:ring-2"
                                            onClick={() => actions.open(report.id)}
                                            type="button"
                                        >
                                            <span className="bg-muted text-muted-foreground rounded-app-sm grid size-6.5 shrink-0 place-items-center">
                                                <Glyph icon={dimensionIcon(report.definition.rows)} size={14} />
                                            </span>
                                            {report.name}
                                        </button>
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} text-muted-foreground`}>
                                        {words.rowsBy(report.definition)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} text-muted-foreground`}>
                                        {copy.measures[report.definition.measure]}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} dash-figure text-muted-foreground`}>
                                        {rangeOf(report)}
                                    </Table.Cell>
                                    <Table.Cell align="end" className={`${CELL} dash-figure`}>
                                        {totals.get(report.id)}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} text-muted-foreground`}>
                                        {shared.has(report.id) ? (
                                            <Badge className={BADGE} dot variant="success">
                                                {copy.library.sharing.linkOn}
                                            </Badge>
                                        ) : (
                                            copy.library.sharing.private
                                        )}
                                    </Table.Cell>
                                    <Table.Cell className={`${CELL} dash-figure text-muted-foreground`}>
                                        {opened(report.openedAt)}
                                    </Table.Cell>
                                    <Table.Cell align="end" className={CELL}>
                                        <RowMenu actions={actions} report={report} words={words} />
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table>
                )}
            </section>
            {elsewhere.length === 0 ? null : (
                <p className="text-muted-foreground text-app-label mt-3 flex flex-wrap items-center gap-x-2 px-1">
                    {elsewhere.length === 1
                        ? copy.library.sharing.elsewhereOne
                        : copy.library.sharing.elsewhere({ count: String(elsewhere.length) })}
                    <button
                        className="text-foreground focus-visible:ring-ring rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                        onClick={() => onForget(elsewhere.map((link) => link.reportId))}
                        type="button"
                    >
                        {elsewhere.length === 1 ? copy.library.sharing.turnOffOne : copy.library.sharing.turnOff}
                    </button>
                </p>
            )}
        </div>
    );
}
