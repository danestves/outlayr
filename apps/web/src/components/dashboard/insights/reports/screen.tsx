import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BookmarkAdd01Icon from "@hugeicons/core-free-icons/BookmarkAdd01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import Link01Icon from "@hugeicons/core-free-icons/Link01Icon";
import { useMatch, useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useCallback, useMemo, useState } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { download } from "@/components/dashboard/settings/data/write";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf } from "@/lib/dashboard-series-period";
import { useTagBooks } from "@/lib/ledger-db";

import { InsightsBar } from "../bar";
import { ReportCard, reportFigures } from "./card";
import { Chart } from "./chart";
import { DeleteDialog, ExportDialog, RenameDialog, SaveDialog } from "./dialogs";
import type { ExportJob } from "./dialogs";
import { Landing, NoData } from "./empty";
import { csvOf, entryRows, tableRows } from "./export";
import { Library } from "./library";
import { publishLink, removeLink, useSharedLinks } from "./links";
import { buildReport } from "./model";
import type { Definition, Report } from "./model";
import { Pivot } from "./pivot";
import { PrintSheet } from "./print";
import { monthsOf } from "./reading";
import { SavedList } from "./saved";
import type { ReportActions } from "./saved";
import { definitionOf, isBuilding, searchOf } from "./search";
import type { ReportsPatch, ReportsSearch } from "./search";
import { canHideAmounts, snapshotOf } from "./share";
import { ShareDialog } from "./share-dialog";
import type { ShareOptions } from "./share-dialog";
import { reportStore, useSavedReports } from "./store";
import type { SavedReport } from "./store";
import { Toolbar } from "./toolbar";
import { useReportWords } from "./words";
import type { ReportWords } from "./words";

const ROUTE = "/_account/app/insights/reports";
const PATH = "/app/insights/reports";
const CHART_PRINT_WIDTH = 720;

type Modal =
    | { id: string | null; kind: "delete" | "export" | "rename" }
    | { id: string; kind: "share" }
    | { kind: "save"; share: boolean };

const sameDefinition = (a: Definition, b: Definition) =>
    JSON.stringify([searchOf(a), a.accounts]) === JSON.stringify([searchOf(b), b.accounts]);

interface Printing {
    job: ExportJob;
    name: string;
    report: Report;
    definition: Definition;
}

interface CsvInput {
    definition: Definition;
    job: ExportJob;
    ledger: Ledger;
    report: Report;
    words: ReportWords;
}

function csvOfReport({ definition: target, job, ledger, report: exportReport, words }: CsvInput) {
    const { copy } = words;
    const lastColumn = exportReport.columns.at(-1);
    const names = {
        average: copy.table.average.value,
        columns: exportReport.columns.map((column) => words.columnName(target.columns, column, exportReport.columns)),
        corner: copy.dimensions[target.rows].value,
        rows: exportReport.rows.map((row) => words.rowName(row.label, target.rows)),
        total: copy.table.total.value,
        versus: lastColumn
            ? copy.table.versus({
                  column: words.columnName(target.columns, lastColumn, exportReport.columns),
              }).value
            : "",
    };
    const table = tableRows(exportReport, names, job.averages && target.columns !== "none");
    const categoryNames = new Map(
        ledger.books.categories.filter((row) => row.deletedAt === null).map((row) => [row.localId, row.name ?? ""])
    );
    const entries = job.entries
        ? [
              [],
              ...entryRows(exportReport, {
                  account: (id) => (id === null ? "" : (ledger.accounts.get(id)?.name ?? "")),
                  category: (id) => (id === null ? "" : (categoryNames.get(id) ?? "")),
                  headers: [
                      copy.csv.date.value,
                      copy.csv.description.value,
                      copy.csv.category.value,
                      copy.csv.account.value,
                      copy.csv.type.value,
                      copy.csv.amount.value,
                  ],
                  types: { income: copy.csv.income.value, spending: copy.csv.spending.value },
              }),
          ]
        : [];
    return csvOf([...table, ...entries]);
}

function PrintedReport({ onDone, printing, words }: { onDone: () => void; printing: Printing; words: ReportWords }) {
    const { copy } = words;
    return (
        <PrintSheet onDone={onDone} title={printing.job.fileName.replace(/\.pdf$/, "")}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 4px" }}>{printing.name}</h1>
            <Chart
                fixedWidth={CHART_PRINT_WIDTH}
                grouping={printing.definition.columns}
                kind={printing.definition.rows}
                label={
                    copy.chart.label({
                        columns: copy.groupings[printing.definition.columns].name.value,
                        measure: copy.measures[printing.definition.measure].value,
                        rows: copy.dimensions[printing.definition.rows].value,
                    }).value
                }
                report={printing.report}
                words={words}
            />
            <Pivot
                averages={printing.job.averages}
                grouping={printing.definition.columns}
                kind={printing.definition.rows}
                report={printing.report}
                words={words}
            />
        </PrintSheet>
    );
}

interface NoDataInput {
    definition: Definition;
    ledger: Ledger;
    rangeName: string;
    tags: readonly { id: string; name: string }[];
    words: ReportWords;
}

function noDataBodyOf({ definition, ledger, rangeName, tags, words }: NoDataInput) {
    const { copy } = words;
    if (definition.accounts.length === 0 && definition.tags.length === 0) {
        return copy.noData.without({ range: rangeName }).value;
    }
    const filterNames = [
        ...definition.accounts.map((id) => ledger.accounts.get(id)?.name ?? ""),
        ...tags.filter((tag) => definition.tags.includes(tag.id)).map((tag) => `#${tag.name}`),
        rangeName,
    ];
    return copy.noData.withFilters({ filters: filterNames.join(", "), range: rangeName }).value;
}

const savedFor = <Saved extends { id: string }>(modal: Modal | null, saved: readonly Saved[]) =>
    modal && "id" in modal ? saved.find((each) => each.id === modal.id) : undefined;

const rangeOf = (report: Report, currentKey: string, words: ReportWords) =>
    words.rangeName(monthsOf(report.columns, currentKey));

const sharedFor = (modal: Modal | null, report: SavedReport | undefined) =>
    modal?.kind === "share" ? report : undefined;

interface SharingInput {
    books: ReturnType<typeof useTagBooks>;
    ledger: Ledger;
    words: ReportWords;
}

/** A link's copy is built here, in the browser, from the ledger the owner is looking at. */
function useSharing({ books, ledger, words }: SharingInput) {
    const all = useSharedLinks();
    const { notify } = useLedgerCommitter();
    const [forgotten, setForgotten] = useState<ReadonlySet<string>>(new Set());
    const links = all.filter((link) => !forgotten.has(link.reportId));
    const linkOf = (id: string) => links.find((each) => each.reportId === id);
    const refused = () => {
        notify({ failed: true, text: words.copy.sharing.failed.value });
    };
    const snapshot = (target: SavedReport, amounts: boolean) =>
        snapshotOf({
            amounts,
            currency: ledger.currency,
            definition: target.definition,
            name: target.name,
            report: buildReport({ books, definition: target.definition, ledger }),
            rowName: (label) => words.rowName(label, target.definition.rows),
        });
    const publish = async (target: SavedReport, { amounts, expires }: ShareOptions) => {
        const report = snapshot(target, amounts);
        if (report === null) {
            throw new Error("This report has no percentages to share");
        }
        await publishLink({ expires, report, reportId: target.id });
    };
    return {
        forget: (ids: readonly string[]) => {
            const remember = () => setForgotten((before) => new Set([...before].filter((id) => !ids.includes(id))));
            setForgotten((before) => new Set([...before, ...ids]));
            Promise.all(ids.map((id) => removeLink(id)))
                .catch(refused)
                .finally(remember);
        },
        linkOf,
        links,
        publish,
        refresh: (target: SavedReport) => {
            const link = linkOf(target.id);
            const report = link ? snapshot(target, link.unit === "amount") : null;
            if (report !== null) {
                publishLink({ expires: "keep", report, reportId: target.id }).catch(refused);
            }
        },
    };
}

interface ShareModalProps {
    hideable: boolean;
    now: number;
    onClose: () => void;
    sharing: ReturnType<typeof useSharing>;
    target: SavedReport | undefined;
    words: ReportWords;
}

function ShareModal({ hideable, now, onClose, sharing, target, words }: ShareModalProps) {
    return (
        <ShareDialog
            hideable={hideable}
            key={target?.id ?? "share"}
            link={target ? sharing.linkOf(target.id) : undefined}
            name={target?.name ?? ""}
            now={now}
            onClose={onClose}
            onPublish={(options) => (target ? sharing.publish(target, options) : Promise.resolve())}
            onRemove={() => target && sharing.forget([target.id])}
            open={target !== undefined}
            words={words}
        />
    );
}

export function ReportsScreen() {
    const { filters, ledger, setFilters } = useDashboard();
    const search: ReportsSearch = useSearch({ from: ROUTE });
    const navigate = useNavigate({ from: PATH });
    const books = useTagBooks();
    const userId = useMatch({ from: "/_account/app", select: (match) => match.loaderData?.userId });
    const store = reportStore(userId ?? "");
    const saved = useSavedReports(store);
    const words = useReportWords();
    const sharing = useSharing({ books, ledger, words });
    const { copy } = words;
    const [modal, setModal] = useState<Modal | null>(null);
    const [printing, setPrinting] = useState<Printing | null>(null);
    const stopPrinting = useCallback(() => setPrinting(null), []);

    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    const earliestKey = useMemo(
        () =>
            periodKeyOf(
                ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today),
                ledger.firstDayOfMonth
            ),
        [ledger]
    );
    const tags = useMemo(
        () =>
            books.tags
                .filter((tag) => tag.deletedAt === null)
                .map((tag) => ({ id: tag.localId, name: tag.name }))
                .toSorted((a, b) => a.name.localeCompare(b.name)),
        [books.tags]
    );
    const accountChoices = useMemo(
        () => Array.from(ledger.accounts, ([id, account]) => ({ id, name: account.name })),
        [ledger.accounts]
    );
    const definition = useMemo(
        () =>
            definitionOf(search, {
                accounts: filters.accounts,
                currentKey,
                earliestKey,
                tagIds: new Set(tags.map((tag) => tag.id)),
            }),
        [currentKey, earliestKey, filters.accounts, search, tags]
    );
    const report = useMemo(() => buildReport({ books, definition, ledger }), [books, definition, ledger]);
    const active = saved.find((each) => each.id === search.report);
    const dirty = active !== undefined && !sameDefinition(active.definition, definition);

    const patch = (next: ReportsPatch) => navigate({ replace: true, search: (prev) => ({ ...prev, ...next }) });
    const build = (next: Definition, reportId?: string) => {
        setFilters({ accounts: next.accounts });
        return patch({ ...searchOf(next), report: reportId, view: undefined });
    };
    const share = (target: SavedReport) => {
        sharing.refresh(target);
        setModal({ id: target.id, kind: "share" });
    };
    const shareOpen = (current: SavedReport) => {
        if (dirty) {
            store.change(current.id, { definition });
        }
        share({ ...current, definition });
    };
    const open = (id: string) => {
        const target = saved.find((each) => each.id === id);
        if (target) {
            store.change(id, { openedAt: ledger.now });
            build(target.definition, id);
        }
    };
    const actions: ReportActions = {
        duplicate: (id) => {
            const source = saved.find((each) => each.id === id);
            if (source) {
                store.duplicate(id, copy.saved.copy({ name: source.name }).value, ledger.now);
            }
        },
        export: (id) => setModal({ id, kind: "export" }),
        open,
        remove: (id) => setModal({ id, kind: "delete" }),
        rename: (id) => setModal({ id, kind: "rename" }),
        share: (id) => {
            const target = saved.find((each) => each.id === id);
            if (target && search.view !== "all" && target.id === active?.id) {
                shareOpen(target);
            } else if (target) {
                share(target);
            }
        },
    };
    const modalReport = savedFor(modal, saved);
    const showing = modal?.kind;
    const exportDefinition = modalReport?.definition ?? definition;
    const exportReport = useMemo(
        () => (modalReport ? buildReport({ books, definition: modalReport.definition, ledger }) : report),
        [books, ledger, modalReport, report]
    );
    const close = () => setModal(null);

    const run = (job: ExportJob) => {
        const target = exportDefinition;
        const name = modalReport?.name ?? words.title(target);
        close();
        if (job.format === "pdf") {
            setPrinting({ definition: target, job, name, report: exportReport });
            return;
        }
        download(
            job.fileName,
            csvOfReport({ definition: target, job, ledger, report: exportReport, words }),
            "text/csv;charset=utf-8"
        );
    };

    const empty = report.entries === 0;
    const landing = saved.length === 0 && !isBuilding(search) && search.view === undefined;
    const library = search.view === "all";
    const rangeName = rangeOf(report, currentKey, words);

    const figures = reportFigures({ definition, empty, report, words });
    const noDataBody = noDataBodyOf({ definition, ledger, rangeName, tags, words });

    const saving = active ? (
        <Button disabled={!dirty} onClick={() => store.change(active.id, { definition })}>
            <Glyph icon={BookmarkAdd01Icon} size={16} />
            {copy.bar.update}
        </Button>
    ) : (
        <Button disabled={empty} onClick={() => setModal({ kind: "save", share: false })}>
            <Glyph icon={BookmarkAdd01Icon} size={16} />
            {copy.bar.saveReport}
        </Button>
    );

    const main = library ? (
        <Library
            actions={actions}
            books={books}
            currentKey={currentKey}
            ledger={ledger}
            links={sharing.links}
            now={ledger.now}
            onForget={sharing.forget}
            reports={saved}
            words={words}
        />
    ) : (
        <ReportCard
            averages
            definition={definition}
            figures={figures}
            noData={
                empty ? (
                    <NoData
                        body={noDataBody}
                        columns={[
                            ...report.columns.map((column) =>
                                words.columnName(definition.columns, column, report.columns)
                            ),
                            ...(definition.columns === "none" ? [] : [copy.table.average.value]),
                        ]}
                        corner={copy.dimensions[definition.rows].value}
                        onClear={() => {
                            setFilters({ accounts: [] });
                            patch({ tags: undefined });
                        }}
                        words={words}
                    />
                ) : undefined
            }
            report={report}
            words={words}
        />
    );

    const newReport = (
        <Button onClick={() => build(definition)}>
            <Glyph icon={Add01Icon} size={16} />
            {copy.bar.newReport}
        </Button>
    );
    const reportActions = landing ? null : (
        <>
            <Button disabled={empty} onClick={() => setModal({ id: null, kind: "export" })} variant="outline">
                <Glyph icon={Download01Icon} size={16} />
                {copy.bar.export}
            </Button>
            <Button
                disabled={empty}
                onClick={() => {
                    if (active === undefined) {
                        setModal({ kind: "save", share: true });
                        return;
                    }
                    shareOpen(active);
                }}
                variant="outline"
            >
                <Glyph icon={Link01Icon} size={16} />
                {copy.bar.share}
            </Button>
            {saving}
        </>
    );

    return (
        <>
            <InsightsBar>{library ? newReport : reportActions}</InsightsBar>
            {landing ? (
                <div className="flex flex-1 flex-col pt-4 pb-6">
                    <Landing
                        currentKey={currentKey}
                        onBuild={(next) => patch({ ...next, view: undefined })}
                        onNew={() => build(definition)}
                        words={words}
                    />
                </div>
            ) : (
                <div className="flex flex-1 flex-col pb-5">
                    {library ? null : (
                        <Toolbar
                            accounts={accountChoices}
                            bounds={{ current: currentKey, earliest: earliestKey }}
                            definition={definition}
                            onAccounts={(ids) => setFilters({ accounts: ids })}
                            onPatch={(next) => patch({ ...next, report: search.report })}
                            tags={tags}
                            words={words}
                        />
                    )}
                    {library ? (
                        main
                    ) : (
                        <div className="grid flex-1 grid-cols-1 gap-4 xl:min-h-[808px] xl:grid-cols-[232px_minmax(0,1fr)]">
                            <SavedList
                                actions={actions}
                                activeId={active?.id}
                                currentKey={currentKey}
                                onAll={() => patch({ view: "all" })}
                                reports={saved}
                                words={words}
                            />
                            {main}
                        </div>
                    )}
                </div>
            )}
            <SaveDialog
                currentKey={currentKey}
                definition={definition}
                key={showing === "save" ? "save-open" : "save"}
                name={words.title(definition)}
                onClose={close}
                onSave={(name, chosen) => {
                    const created = store.save(name, chosen, ledger.now);
                    setModal(modal?.kind === "save" && modal.share ? { id: created.id, kind: "share" } : null);
                    build(chosen, created.id);
                }}
                open={showing === "save"}
                words={words}
            />
            <RenameDialog
                key={modalReport?.id ?? "rename"}
                name={modalReport?.name ?? ""}
                onClose={close}
                onRename={(name) => {
                    if (modalReport) {
                        store.change(modalReport.id, { name });
                    }
                    close();
                }}
                open={showing === "rename" && modalReport !== undefined}
                words={words}
            />
            <DeleteDialog
                name={modalReport?.name ?? ""}
                onClose={close}
                onDelete={() => {
                    if (modalReport) {
                        store.remove(modalReport.id);
                        if (sharing.linkOf(modalReport.id)) {
                            sharing.forget([modalReport.id]);
                        }
                        if (modalReport.id === search.report) {
                            patch({ report: undefined });
                        }
                    }
                    close();
                }}
                open={showing === "delete" && modalReport !== undefined}
                words={words}
            />
            <ExportDialog
                columnsName={`${exportReport.columns.length} ${copy.groupings[exportDefinition.columns][exportReport.columns.length === 1 ? "one" : "many"].value}`}
                key={modalReport?.id ?? "export"}
                name={modalReport?.name ?? words.title(exportDefinition)}
                onClose={close}
                onExport={run}
                open={showing === "export"}
                rangeName={rangeOf(exportReport, currentKey, words)}
                report={exportReport}
                words={words}
            />
            <ShareModal
                hideable={canHideAmounts(exportReport)}
                now={ledger.now}
                onClose={close}
                sharing={sharing}
                target={sharedFor(modal, modalReport)}
                words={words}
            />
            {printing ? <PrintedReport onDone={stopPrinting} printing={printing} words={words} /> : null}
        </>
    );
}
