import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import BookmarkAdd01Icon from "@hugeicons/core-free-icons/BookmarkAdd01Icon";
import Download01Icon from "@hugeicons/core-free-icons/Download01Icon";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useCallback, useMemo, useState } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { download } from "@/components/dashboard/settings/data/write";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf } from "@/lib/dashboard-series-period";
import { useTagBooks } from "@/lib/ledger-db";

import { InsightsBar } from "../bar";
import { ReportCard } from "./card";
import type { Figure } from "./card";
import { Chart } from "./chart";
import { DeleteDialog, ExportDialog, RenameDialog, SaveDialog } from "./dialogs";
import type { ExportJob } from "./dialogs";
import { Landing } from "./empty";
import { csvOf, entryRows, tableRows } from "./export";
import { Library } from "./library";
import { buildReport } from "./model";
import type { Definition, Report } from "./model";
import { Pivot } from "./pivot";
import { PrintSheet } from "./print";
import { SavedList } from "./saved";
import type { ReportActions } from "./saved";
import { definitionOf, isBuilding, searchOf } from "./search";
import type { ReportsPatch, ReportsSearch } from "./search";
import { changeReport, deleteReport, duplicateReport, saveReport, useSavedReports } from "./store";
import { Toolbar } from "./toolbar";
import { useReportWords } from "./words";
import type { ReportWords } from "./words";

const ROUTE = "/_account/app/insights/reports";
const PATH = "/app/insights/reports";
const CHART_PRINT_WIDTH = 720;
const RISE_TONES = { average: "flat", count: "flat", income: "good", net: "flat", spending: "poor" } as const;

type Modal = { id: string | null; kind: "delete" | "export" | "rename" } | { kind: "save" };

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
    const categoryNames = new Map(ledger.books.categories.map((row) => [row.localId, row.name ?? ""]));
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

interface FiguresInput {
    definition: Definition;
    empty: boolean;
    report: Report;
    words: ReportWords;
}

function reportFigures({ definition, empty, report, words }: FiguresInput) {
    const { copy } = words;
    const span = report.columns.length;
    const [first] = report.columns;
    const last = report.columns.at(-1);
    const columnLabel = (column: typeof first) =>
        column ? words.columnName(definition.columns, column, report.columns) : "";
    const unit = copy.groupings[definition.columns];
    const figures: Figure[] = [
        {
            label:
                definition.columns === "none"
                    ? copy.kpi.totalPlain
                    : copy.kpi.total({ count: String(span), unit: (span === 1 ? unit.one : unit.many).value }),
            value: words.measureValue(definition.measure, report.totals.total),
        },
        ...(definition.columns === "none"
            ? []
            : [{ label: unit.average, value: words.measureValue(definition.measure, report.totals.average) }]),
        empty
            ? { label: copy.kpi.entries, value: "0" }
            : {
                  label: report.rise
                      ? copy.kpi.rise({ from: columnLabel(first), to: columnLabel(last) })
                      : copy.kpi.riseNone,
                  value: report.rise ? (
                      <span className="flex items-center gap-2">
                          {words.rowName(report.rise.label, definition.rows)}
                          <span className="dash-trend" data-tone={RISE_TONES[definition.measure]}>
                              {`+${words.measureValue(definition.measure, report.rise.delta)}`}
                          </span>
                      </span>
                  ) : (
                      "–"
                  ),
              },
    ].slice(0, 3);
    return figures;
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

const rangeOf = (report: Report, currentKey: string, words: ReportWords) => {
    const [first] = report.columns;
    const last = report.columns.at(-1);
    return words.rangeName({
        from: first?.from.slice(0, 7) ?? currentKey,
        to: last?.to.slice(0, 7) ?? currentKey,
    });
};

export function ReportsScreen() {
    const { filters, ledger, setFilters } = useDashboard();
    const search: ReportsSearch = useSearch({ from: ROUTE });
    const navigate = useNavigate({ from: PATH });
    const books = useTagBooks();
    const saved = useSavedReports();
    const words = useReportWords();
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
    const open = (id: string) => {
        const target = saved.find((each) => each.id === id);
        if (target) {
            changeReport(id, { openedAt: ledger.now });
            build(target.definition, id);
        }
    };
    const actions: ReportActions = {
        duplicate: (id) => {
            const source = saved.find((each) => each.id === id);
            if (source) {
                duplicateReport(id, copy.saved.copy({ name: source.name }).value, ledger.now);
            }
        },
        export: (id) => setModal({ id, kind: "export" }),
        open,
        remove: (id) => setModal({ id, kind: "delete" }),
        rename: (id) => setModal({ id, kind: "rename" }),
    };
    const modalReport = savedFor(modal, saved);
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
        <Button disabled={!dirty} onClick={() => changeReport(active.id, { definition })}>
            <Glyph icon={BookmarkAdd01Icon} size={16} />
            {copy.bar.update}
        </Button>
    ) : (
        <Button disabled={empty} onClick={() => setModal({ kind: "save" })}>
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
            now={ledger.now}
            reports={saved}
            words={words}
        />
    ) : (
        <ReportCard
            averages
            definition={definition}
            empty={empty}
            figures={figures}
            noDataBody={noDataBody}
            onClear={() => {
                setFilters({ accounts: [] });
                patch({ tags: undefined });
            }}
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
                key={modal?.kind === "save" ? "save-open" : "save"}
                name={words.title(definition)}
                onClose={close}
                onSave={(name, chosen) => {
                    const created = saveReport(name, chosen, ledger.now);
                    close();
                    build(chosen, created.id);
                }}
                open={modal?.kind === "save"}
                words={words}
            />
            <RenameDialog
                key={modalReport?.id ?? "rename"}
                name={modalReport?.name ?? ""}
                onClose={close}
                onRename={(name) => {
                    if (modalReport) {
                        changeReport(modalReport.id, { name });
                    }
                    close();
                }}
                open={modal?.kind === "rename" && modalReport !== undefined}
                words={words}
            />
            <DeleteDialog
                name={modalReport?.name ?? ""}
                onClose={close}
                onDelete={() => {
                    if (modalReport) {
                        deleteReport(modalReport.id);
                        if (modalReport.id === search.report) {
                            patch({ report: undefined });
                        }
                    }
                    close();
                }}
                open={modal?.kind === "delete" && modalReport !== undefined}
                words={words}
            />
            <ExportDialog
                columnsName={`${exportReport.columns.length} ${copy.groupings[exportDefinition.columns][exportReport.columns.length === 1 ? "one" : "many"].value}`}
                key={modalReport?.id ?? "export"}
                name={modalReport?.name ?? words.title(exportDefinition)}
                onClose={close}
                onExport={run}
                open={modal?.kind === "export"}
                rangeName={rangeOf(exportReport, currentKey, words)}
                report={exportReport}
                words={words}
            />
            {printing ? <PrintedReport onDone={stopPrinting} printing={printing} words={words} /> : null}
        </>
    );
}
