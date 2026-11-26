import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { Empty } from "@/components/dashboard/home/empty";
import { SuggestDialog } from "@/components/dashboard/settings/about/suggest";
import { viewTransition } from "@/lib/motion";

import { handOff, kindOf, routeOf } from "./hand-off";
import { HistoryKpis, HistoryTable, ImportTable, LastImportCard } from "./history";
import { NotionDialog, useExportUpload, useNotion, useNotionAllowed } from "./notion";
import { Card, Columns, DROPZONE, FilePicker, ImportBar, ImportPage, NOTE, SourceTile, useFileDrop } from "./parts";
import { useImportHistory } from "./store";
import type { ImportSource } from "./store";
import { importToasts } from "./toasts";
import { useImportStore } from "./undo";

type Tab = "history" | "new";

const RECENT = 6;
const READABLE = /\.(?:csv|tsv|txt|pdf|mmbackup)$/i;
const ZIP = /\.zip$/i;
const ACCEPT = ".csv,.tsv,.txt,.pdf,.mmbackup,text/csv,application/pdf";
const NOTION_ACCEPT = `${ACCEPT},.zip,application/zip`;

function useOpenFile() {
    const navigate = useNavigate();
    const { home } = useIntlayer("dashboard-import");
    const notionAllowed = useNotionAllowed();
    const upload = useExportUpload((message) => importToasts.add({ title: message, type: "destructive" }));
    return (file: File) => {
        if (ZIP.test(file.name)) {
            if (notionAllowed) {
                void upload(file);
            } else {
                importToasts.add({ title: home.unknownFile.value, type: "destructive" });
            }
            return;
        }
        if (!READABLE.test(file.name) && file.type !== "text/csv" && file.type !== "application/pdf") {
            importToasts.add({ title: home.unknownFile.value, type: "destructive" });
            return;
        }
        handOff(file);
        const to = routeOf(file);
        void navigate(
            to === "/import/file"
                ? { search: { kind: kindOf(file) }, to, viewTransition: viewTransition("push-left") }
                : { to, viewTransition: viewTransition("push-left") }
        );
    };
}

export function ImportTabs({ count, onTab, tab }: { count: number; onTab: (tab: Tab) => void; tab: Tab }) {
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

export function SourceRow({
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
                <b className="text-app-body block truncate leading-5 font-medium">{title}</b>
                <small className="text-muted-foreground text-app-label block truncate leading-5">{hint}</small>
            </span>
            <Glyph className="text-muted-foreground flex-none" icon={ArrowRight01Icon} size={16} />
        </button>
    );
}

function Sources({ onNotion }: { onNotion: () => void }) {
    const { sources } = useIntlayer("dashboard-import");
    const navigate = useNavigate();
    const notionAllowed = useNotionAllowed();
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
                <h3 className="text-muted-foreground text-app-label flex h-11 items-center border-b px-4 font-medium">
                    {sources.fromApp}
                </h3>
                <SourceRow
                    hint={sources.moneyManagerHint}
                    onClick={() =>
                        navigate({ to: "/import/money-manager", viewTransition: viewTransition("push-left") })
                    }
                    source="moneyManager"
                    title={sources.moneyManager}
                />
                {notionAllowed ? (
                    <SourceRow hint={notionHint} onClick={onNotion} source="notion" title={sources.notion} />
                ) : null}
            </div>
            <div className={`${column} @max-3xl:border-t`}>
                <h3 className="text-muted-foreground text-app-label flex h-11 items-center border-b px-4 font-medium">
                    {sources.fromFile}
                </h3>
                <SourceRow
                    hint={sources.csvHint}
                    onClick={() =>
                        navigate({
                            search: { kind: "csv" },
                            to: "/import/file",
                            viewTransition: viewTransition("push-left"),
                        })
                    }
                    source="csv"
                    title={sources.csv}
                />
                <SourceRow
                    hint={sources.pdfHint}
                    onClick={() =>
                        navigate({
                            search: { kind: "pdf" },
                            to: "/import/file",
                            viewTransition: viewTransition("push-left"),
                        })
                    }
                    source="pdf"
                    title={sources.pdf}
                />
            </div>
        </div>
    );
}

export function DropAnywhere({ over, onFile }: { over: boolean; onFile: (file: File) => void }) {
    const { home } = useIntlayer("dashboard-import");
    const notionAllowed = useNotionAllowed();
    return (
        <div className="p-5">
            <div className={`${DROPZONE} h-32.75 ${over ? "border-primary bg-primary/6" : ""}`}>
                <b className="text-app-title leading-5 font-semibold">{over ? home.dropHere : home.dropAnywhere}</b>
                <p className="text-muted-foreground text-app-label mt-1 leading-5">{home.dropAnywhereHint}</p>
                <FilePicker accept={notionAllowed ? NOTION_ACCEPT : ACCEPT} onFile={onFile}>
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
    const notionAllowed = useNotionAllowed();
    const [notionOpen, setNotionOpen] = useState(notionReturn && notionAllowed);
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
                        <Empty
                            action={<NewImportButton onClick={() => onTab("new")} />}
                            icon={Upload04Icon}
                            line={history.noImportsHint}
                            title={history.noImports}
                        />
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
            {notionAllowed ? <NotionDialog onClose={() => setNotionOpen(false)} open={notionOpen} /> : null}
        </div>
    );
}
