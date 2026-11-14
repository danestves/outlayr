import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { SuggestDialog } from "@/components/dashboard/settings/about/suggest";

import { handOff, kindOf, routeOf } from "./hand-off";
import { CELL, HEAD, HistoryKpis, HistoryTable, ImportTable, LastImportCard } from "./history";
import { NotionDialog, useExportUpload, useNotion } from "./notion";
import { Card, Columns, DROPZONE, FilePicker, ImportBar, ImportPage, NOTE, SourceTile, useFileDrop } from "./parts";
import { useImportHistory } from "./store";
import type { ImportSource } from "./store";
import { importToasts } from "./toasts";
import { useImportStore } from "./undo";

type Tab = "history" | "new";

const RECENT = 6;
const READABLE = /\.(?:csv|tsv|txt|pdf|mmbackup)$/i;
const ZIP = /\.zip$/i;
const ACCEPT = ".csv,.tsv,.txt,.pdf,.mmbackup,.zip,text/csv,application/pdf,application/zip";

function useOpenFile() {
    const navigate = useNavigate();
    const { home } = useIntlayer("dashboard-import");
    const upload = useExportUpload((message) => importToasts.add({ title: message, type: "destructive" }));
    return (file: File) => {
        if (ZIP.test(file.name)) {
            void upload(file);
            return;
        }
        if (!READABLE.test(file.name) && file.type !== "text/csv" && file.type !== "application/pdf") {
            importToasts.add({ title: home.unknownFile.value, type: "destructive" });
            return;
        }
        handOff(file);
        const to = routeOf(file);
        void navigate(to === "/import/file" ? { search: { kind: kindOf(file) }, to } : { to });
    };
}

function ImportTabs({ count, onTab, tab }: { count: number; onTab: (tab: Tab) => void; tab: Tab }) {
    const { tabs } = useIntlayer("dashboard-import");
    return (
        <Tabs
            className="min-w-0 flex-1"
            onValueChange={(value) => onTab(value === "history" ? "history" : "new")}
            value={tab}
            variant="underline"
        >
            <Tabs.List aria-label={tabs.newImport.value}>
                <Tabs.Trigger value="new">{tabs.newImport}</Tabs.Trigger>
                <Tabs.Trigger value="history">
                    {tabs.history}
                    <Tabs.Badge className="dash-figure text-muted-foreground bg-transparent! px-0">{count}</Tabs.Badge>
                </Tabs.Trigger>
            </Tabs.List>
        </Tabs>
    );
}

function SourceRow({
    hint,
    onClick,
    source,
    title,
}: {
    hint: ReactNode;
    onClick: () => void;
    source: ImportSource;
    title: ReactNode;
}) {
    return (
        <button
            className="hover:bg-app-fill/50 flex h-16 w-full min-w-0 items-center gap-3 border-b px-4 text-start transition-colors"
            onClick={onClick}
            type="button"
        >
            <SourceTile size="md" source={source} />
            <span className="min-w-0 flex-1">
                <b className="block truncate text-sm leading-5 font-medium">{title}</b>
                <small className="text-muted-foreground block truncate text-[13px] leading-5">{hint}</small>
            </span>
            <Glyph className="text-muted-foreground flex-none" icon={ArrowRight01Icon} size={16} />
        </button>
    );
}

function Sources({ onNotion }: { onNotion: () => void }) {
    const { sources } = useIntlayer("dashboard-import");
    const navigate = useNavigate();
    const notion = useNotion();
    const workspace = notion.sources.data?.workspaceName ?? null;
    let notionHint: ReactNode = sources.notionHint;
    if (notion.connected) {
        notionHint = workspace ? sources.notionConnected({ name: workspace }) : sources.notionConnectedPlain;
    }
    const column = "min-w-0 [&>button:last-child]:border-b-0 @3xl:[&>button:last-child]:border-b";
    return (
        <div className="grid grid-cols-1 border-b @3xl:grid-cols-2 @3xl:divide-x">
            <div className={column}>
                <h3 className="text-muted-foreground flex h-11 items-center border-b px-4 text-[13px] font-medium">
                    {sources.fromApp}
                </h3>
                <SourceRow
                    hint={sources.moneyManagerHint}
                    onClick={() => navigate({ to: "/import/money-manager" })}
                    source="moneyManager"
                    title={sources.moneyManager}
                />
                <SourceRow hint={notionHint} onClick={onNotion} source="notion" title={sources.notion} />
            </div>
            <div className={`${column} @max-3xl:border-t`}>
                <h3 className="text-muted-foreground flex h-11 items-center border-b px-4 text-[13px] font-medium">
                    {sources.fromFile}
                </h3>
                <SourceRow
                    hint={sources.csvHint}
                    onClick={() => navigate({ search: { kind: "csv" }, to: "/import/file" })}
                    source="csv"
                    title={sources.csv}
                />
                <SourceRow
                    hint={sources.pdfHint}
                    onClick={() => navigate({ search: { kind: "pdf" }, to: "/import/file" })}
                    source="pdf"
                    title={sources.pdf}
                />
            </div>
        </div>
    );
}

function DropAnywhere({ over, onFile }: { over: boolean; onFile: (file: File) => void }) {
    const { home } = useIntlayer("dashboard-import");
    return (
        <div className="p-5">
            <div className={`${DROPZONE} h-[131px] ${over ? "border-primary bg-primary/6" : ""}`}>
                <b className="text-[15px] leading-5 font-semibold">{over ? home.dropHere : home.dropAnywhere}</b>
                <p className="text-muted-foreground mt-1 text-[13px] leading-5">{home.dropAnywhereHint}</p>
                <FilePicker accept={ACCEPT} onFile={onFile}>
                    {(open) => (
                        <Button className="mt-3" onClick={open} size="sm" variant="outline">
                            {home.chooseFile}
                        </Button>
                    )}
                </FilePicker>
            </div>
        </div>
    );
}

function RailNotes() {
    const { home } = useIntlayer("dashboard-import");
    const [suggesting, setSuggesting] = useState(false);
    return (
        <>
            <Card title={home.privacy}>
                <p className={`${NOTE} py-4`}>{home.privacyText}</p>
            </Card>
            <Card title={home.anotherApp}>
                <p className={`${NOTE} pt-4 pb-3`}>{home.anotherAppText}</p>
                <div className="px-4 pb-4">
                    <Button className="w-full" onClick={() => setSuggesting(true)} size="sm" variant="outline">
                        {home.tellUs}
                    </Button>
                </div>
            </Card>
            <SuggestDialog onClose={() => setSuggesting(false)} open={suggesting} />
        </>
    );
}

const GHOST_CELL = CELL.replace("h-[51px]", "h-[42px]");
const GHOST_ROWS = [92, 86, 62, 74, 88, 64, 76, 82, 90] as const;

function GhostHistory() {
    return (
        <div aria-hidden className="relative max-h-[410px] overflow-hidden">
            <Table>
                <Table.Header>
                    <Table.Row className="border-b-0">
                        {[46, 44, 46, 40, 38, 42].map((width, index) => (
                            <Table.Head align={index === 5 ? "end" : "start"} className={HEAD} key={width + index}>
                                <i className="dash-gl inline-block" style={{ width }} />
                            </Table.Head>
                        ))}
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {GHOST_ROWS.map((width, index) => (
                        <Table.Row key={width + index}>
                            <Table.Cell className={GHOST_CELL}>
                                <i className="dash-gl inline-block w-9" />
                            </Table.Cell>
                            <Table.Cell className={GHOST_CELL}>
                                <span className="flex items-center gap-2.5">
                                    <i className="dash-gx size-7 rounded-lg" />
                                    <i className="dash-gl" style={{ width }} />
                                </span>
                            </Table.Cell>
                            <Table.Cell className={GHOST_CELL}>
                                <i className="dash-gl inline-block" style={{ width: 48 + (index % 3) * 12 }} />
                            </Table.Cell>
                            <Table.Cell className={GHOST_CELL}>
                                <i className="dash-gl inline-block w-10" />
                            </Table.Cell>
                            <Table.Cell className={GHOST_CELL}>
                                <i className="dash-gl inline-block" style={{ width: 32 + (index % 2) * 10 }} />
                            </Table.Cell>
                            <Table.Cell align="end" className={GHOST_CELL}>
                                <i className="dash-gl inline-block" style={{ width: 52 + (index % 4) * 6 }} />
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table>
            <div className="to-card absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent" />
        </div>
    );
}

function NewImportButton({ onClick }: { onClick: () => void }) {
    const { history } = useIntlayer("dashboard-import");
    return (
        <Button className="gap-1.5" onClick={onClick}>
            <Glyph icon={Add01Icon} size={16} />
            {history.newImport}
        </Button>
    );
}

export function ImportHome({
    notionReturn,
    onTab,
    tab,
}: {
    /** Back from Notion's consent screen, so the database picker opens on its own. */
    notionReturn: boolean;
    onTab: (tab: Tab) => void;
    tab: Tab;
}) {
    const { history, home } = useIntlayer("dashboard-import");
    const store = useImportStore();
    const records = useImportHistory(store);
    const [notionOpen, setNotionOpen] = useState(notionReturn);
    const openFile = useOpenFile();
    const drop = useFileDrop(openFile);
    const [latest] = records;
    const tabs = <ImportTabs count={records.length} onTab={onTab} tab={tab} />;

    if (tab === "history") {
        return (
            <ImportPage>
                <ImportBar>{records.length > 0 ? <NewImportButton onClick={() => onTab("new")} /> : null}</ImportBar>
                {latest && store ? (
                    <div className="flex flex-1 flex-col gap-4">
                        <HistoryKpis records={records} />
                        <Columns rail={latest.undoneAt === null ? <LastImportCard record={latest} rich /> : null}>
                            <Card head={tabs}>
                                <HistoryTable records={records} store={store} />
                            </Card>
                        </Columns>
                    </div>
                ) : (
                    <Card className="flex-1" head={tabs}>
                        <GhostHistory />
                        <div className="flex flex-col items-center px-4 pt-6 pb-10 text-center">
                            <b className="text-[15px] leading-5 font-semibold">{history.noImports}</b>
                            <p className="text-muted-foreground mt-1.5 max-w-80 text-[13px] leading-5">
                                {history.noImportsHint}
                            </p>
                            <div className="mt-4">
                                <NewImportButton onClick={() => onTab("new")} />
                            </div>
                        </div>
                    </Card>
                )}
            </ImportPage>
        );
    }

    return (
        <div className="contents" {...drop.props}>
            <ImportPage>
                <ImportBar />
                <Columns
                    rail={
                        <>
                            {latest ? <LastImportCard record={latest} rich={false} /> : null}
                            <RailNotes />
                        </>
                    }
                >
                    <Card head={tabs}>
                        <Sources onNotion={() => setNotionOpen(true)} />
                        <DropAnywhere onFile={openFile} over={drop.over} />
                    </Card>
                    {latest && store ? (
                        <Card
                            action={
                                <Button onClick={() => onTab("history")} size="sm" variant="secondary">
                                    {home.seeAll}
                                </Button>
                            }
                            title={home.recent}
                        >
                            <ImportTable records={records.slice(0, RECENT)} store={store} />
                        </Card>
                    ) : null}
                </Columns>
            </ImportPage>
            <NotionDialog onClose={() => setNotionOpen(false)} open={notionOpen} />
        </div>
    );
}
