import Note01Icon from "@hugeicons/core-free-icons/Note01Icon";
import Pdf02Icon from "@hugeicons/core-free-icons/Pdf02Icon";
import SparklesIcon from "@hugeicons/core-free-icons/SparklesIcon";
import { Button } from "panelui-web/button";
import { Tabs } from "panelui-web/tabs";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";

import type { Upload, UploadProblem } from "./file-flow";
import {
    Card,
    Columns,
    DROPZONE,
    DropTile,
    FileHead,
    FilePicker,
    fileSize,
    FileStats,
    ImportBar,
    ImportPage,
    Line,
    NOTE,
    useFileDrop,
    WorksWith,
} from "./parts";

type Kind = "csv" | "pdf";

const ACCEPT: Record<Kind, string> = {
    csv: ".csv,.tsv,.txt,text/csv,text/plain",
    pdf: ".pdf,application/pdf",
};

const CSV_PROBLEMS = new Set<UploadProblem>(["fewColumns", "noRows", "notCsv"]);

interface ProblemText {
    hint: ReactNode;
    title: ReactNode;
}

function useProblemText() {
    const { upload } = useIntlayer("dashboard-import");
    const { problem } = upload;
    return (kind: Kind, which: UploadProblem): ProblemText => {
        switch (which) {
            case "tooLarge":
            case "noRows":
            case "fewColumns": {
                return { hint: problem[`${which}Hint`], title: problem[`${which}Title`] };
            }
            case "notCsv": {
                return { hint: upload.notCsvHint, title: upload.notCsv };
            }
            case "notPdf": {
                return { hint: upload.notPdfHint, title: upload.notPdf };
            }
            case "notRead": {
                return { hint: upload.cantReadPdfHint, title: upload.cantReadPdf };
            }
            case "aiOff": {
                return { hint: upload.aiOffHint, title: upload.aiOff };
            }
            case "overLimit": {
                return { hint: problem.overLimitText, title: problem.overLimitTitle };
            }
            case "offline": {
                return { hint: problem.offlineHint, title: problem.offline };
            }
            case "cantOpen": {
                return { hint: problem.cantOpenHint, title: problem.cantOpen };
            }
            default: {
                return {
                    hint: kind === "pdf" ? problem.serviceText : problem.cantOpenHint,
                    title: problem.serviceTitle,
                };
            }
        }
    };
}

function Choose({ kind, open }: { kind: Kind; open: () => void }) {
    const { upload } = useIntlayer("dashboard-import");
    return (
        <Button className="gap-1.5" onClick={open}>
            <Glyph icon={kind === "pdf" ? Pdf02Icon : Note01Icon} size={16} />
            {kind === "pdf" ? upload.choosePdf : upload.chooseCsv}
        </Button>
    );
}

function ProblemRail({ kind }: { kind: Kind }) {
    const { upload } = useIntlayer("dashboard-import");
    const { problem } = upload;
    if (kind === "csv") {
        return (
            <Card title={upload.csvNeeds}>
                <div className="pt-4 [&>div]:border-t [&>div]:border-b-0">
                    <Line label={upload.size} plain>
                        {upload.sizeNeed}
                    </Line>
                    <Line label={upload.rows} plain>
                        {upload.rowsNeed}
                    </Line>
                    <Line label={upload.columns} plain>
                        {upload.columnsNeed}
                    </Line>
                </div>
                <p className={NOTE}>{upload.needsNote}</p>
            </Card>
        );
    }
    const rows = [
        [problem.tooLarge, problem.tooLargeHint],
        [problem.noRows, problem.noRowsHint],
        [problem.fewColumns, problem.fewColumnsHint],
        [problem.cantOpen, problem.cantOpenHint],
        [problem.overLimit, problem.overLimitHint],
    ] as const;
    return (
        <Card title={upload.otherErrors}>
            <div className="pt-4 [&>div]:border-t [&>div]:border-b-0">
                {rows.map(([label, hint]) => (
                    <div
                        className="flex min-h-9 items-center gap-3 border-b px-4 text-[13px] last:border-0"
                        key={label.value}
                    >
                        <span className="text-muted-foreground">{label}</span>
                        <span className="ml-auto text-end">{hint}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}

export function UploadStep({
    kind,
    onCancel,
    onCsvInstead,
    onFile,
    onKind,
    onTurnOnAi,
    upload: state,
}: {
    kind: Kind;
    onCancel: () => void;
    onCsvInstead: () => void;
    onFile: (file: File) => void;
    onKind: (kind: Kind) => void;
    onTurnOnAi: (file: File) => void;
    upload: Upload;
}) {
    const copy = useIntlayer("dashboard-import");
    const { upload } = copy;
    const drop = useFileDrop(onFile);
    const problemText = useProblemText();
    const file = state.kind === "idle" ? null : state.file;
    const source = kind === "pdf" ? "pdf" : "csv";

    let fileNote: ReactNode = kind === "pdf" ? upload.pdfLimit : upload.csvLimit;
    if (state.kind === "reading") {
        fileNote = fileSize(state.file.size);
    } else if (state.kind === "problem" && file) {
        fileNote = state.problem === "notRead" ? upload.notReadDeleted : upload.notRead({ size: fileSize(file.size) });
    }

    let rail: ReactNode = <WorksWith />;
    if (state.kind === "reading" && kind === "pdf") {
        rail = (
            <Card title={copy.home.privacy}>
                <p className={`${NOTE} py-4`}>{upload.privacyPdf}</p>
            </Card>
        );
    } else if (state.kind === "problem") {
        rail = <ProblemRail kind={CSV_PROBLEMS.has(state.problem) ? "csv" : kind} />;
    }

    let dropTitle: ReactNode = kind === "pdf" ? upload.dropPdf : upload.dropCsv;
    if (drop.over) {
        dropTitle = upload.dropToRead;
    }

    const body = () => {
        if (state.kind === "reading") {
            return (
                <div className="w-full max-w-110 text-start">
                    <div className="flex items-center gap-3">
                        <span className="bg-app-fill text-primary flex size-10 flex-none items-center justify-center rounded-[10px]">
                            <Glyph icon={kind === "pdf" ? Pdf02Icon : Note01Icon} size={18} />
                        </span>
                        <div className="min-w-0">
                            <b className="block truncate text-sm font-semibold">
                                {state.phase === "uploading" ? upload.uploading : upload.reading}
                            </b>
                            <small className="text-muted-foreground block truncate text-[13px]">
                                {state.file.name}
                            </small>
                        </div>
                    </div>
                    <div aria-hidden className="mt-4 grid grid-cols-2 gap-1">
                        <i className="bg-primary h-1.5 rounded-full" />
                        <i
                            className={`h-1.5 rounded-full ${state.phase === "reading" ? "bg-primary" : "bg-app-fill"}`}
                        />
                    </div>
                    <p className="text-muted-foreground mt-3 text-[13px] leading-5">{upload.readingNote}</p>
                </div>
            );
        }
        if (state.kind === "problem") {
            const text = problemText(kind, state.problem);
            const offerCsv = kind === "pdf" && state.problem !== "tooLarge";
            return (
                <>
                    <DropTile bad={state.problem !== "aiOff"} icon={SparklesIcon} />
                    <b className="text-[15px] leading-5 font-semibold">{text.title}</b>
                    <p className="text-muted-foreground mt-1.5 max-w-90 text-[13px] leading-5">{text.hint}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {offerCsv ? (
                            <Button onClick={onCsvInstead} size="sm" variant="outline">
                                {upload.importCsvInstead}
                            </Button>
                        ) : null}
                        {state.problem === "aiOff" && file ? (
                            <Button onClick={() => onTurnOnAi(file)}>{upload.turnOn}</Button>
                        ) : (
                            <FilePicker accept={ACCEPT[kind]} onFile={onFile}>
                                {(open) => <Choose kind={kind} open={open} />}
                            </FilePicker>
                        )}
                    </div>
                </>
            );
        }
        return (
            <>
                <DropTile over={drop.over} />
                <b className="text-[15px] leading-5 font-semibold">{dropTitle}</b>
                <p className="text-muted-foreground mt-1.5 text-[13px] leading-5">
                    {kind === "pdf" ? upload.dropPdfHint : upload.dropCsvHint}
                </p>
                <div className={drop.over ? "hidden" : "mt-4"}>
                    <FilePicker accept={ACCEPT[kind]} onFile={onFile}>
                        {(open) => <Choose kind={kind} open={open} />}
                    </FilePicker>
                </div>
            </>
        );
    };

    return (
        <ImportPage>
            <ImportBar step="upload">
                <Button onClick={onCancel} variant="outline">
                    {copy.cancel}
                </Button>
            </ImportBar>
            <Columns
                rail={
                    <>
                        <Card title={upload.file}>
                            <FileHead
                                bad={state.kind === "problem" && state.problem !== "aiOff"}
                                name={file?.name ?? upload.noFile}
                                note={fileNote}
                                source={source}
                            />
                            {state.kind === "problem" ? null : <FileStats columns="–" dates="–" rows="–" />}
                        </Card>
                        {rail}
                    </>
                }
            >
                <Card
                    action={
                        <Tabs
                            onValueChange={(next) => onKind(next === "pdf" ? "pdf" : "csv")}
                            value={kind}
                            variant="segmented"
                        >
                            <Tabs.List aria-label={upload.file.value}>
                                <Tabs.Trigger value="csv">CSV</Tabs.Trigger>
                                <Tabs.Trigger value="pdf">PDF</Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    }
                    title={kind === "pdf" ? upload.pdfCard : upload.csvCard}
                >
                    <div className="px-5 pb-5" {...(state.kind === "reading" ? {} : drop.props)}>
                        <div
                            className={`${DROPZONE} h-[420px] ${drop.over ? "border-primary bg-primary/10 ring-primary/22 border-solid ring-3" : ""} ${state.kind === "problem" ? "border-destructive/40" : ""} ${state.kind === "reading" ? "border-solid" : ""}`}
                        >
                            {body()}
                        </div>
                    </div>
                </Card>
            </Columns>
        </ImportPage>
    );
}
