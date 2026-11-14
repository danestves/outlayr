import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { allowAi, hasAiConsent, useAiConsent } from "@/lib/ai-consent";
import { scrubLabel } from "@/lib/import-file";
import { metaFlag, useMeta } from "@/lib/ledger-settings";

import { askSuggestions, MAX_ASKED } from "./ai";
import type { AiAnswer } from "./ai";
import { useDraft } from "./draft";
import type { Draft, DraftSource, DraftStore } from "./draft";
import { DoneStep, ImportingStep, useRunImport } from "./file-done";
import type { Finished } from "./file-done";
import { isPdf, readImportFile } from "./file-flow";
import type { Upload } from "./file-flow";
import { MatchStep } from "./file-match";
import { ResolveStep } from "./file-resolve";
import type { AiStatus } from "./file-resolve";
import { ReviewStep } from "./file-review";
import { UploadStep } from "./file-upload";
import { peekHandOff, takeHandOff } from "./hand-off";
import type { HandOff } from "./hand-off";
import { useFileModel } from "./model";
import type { FileModel } from "./model";
import { useDraftStore } from "./undo";

type Kind = "csv" | "pdf";

type Run =
    | { draft: Draft; kind: "failed"; model: FileModel; retry: () => void }
    | { kind: "idle" }
    | { kind: "importing"; model: FileModel };

const NO_ASKED = [] as const;

/** Labels nothing on the device could place, the only text that leaves it. */
function unplaced(model: FileModel) {
    const labels = model.groups.flatMap((group) =>
        group.fromCategory || group.found !== "none" ? [] : [scrubLabel(group.label)]
    );
    return [...new Set(labels.filter((label) => label !== ""))].slice(0, MAX_ASKED);
}

function aiStatus({
    consent,
    draft,
    labels,
    query,
}: {
    consent: boolean;
    draft: Draft;
    labels: number;
    query: { data: { answer: AiAnswer; sent: number } | undefined; isError: boolean };
}): AiStatus {
    if (draft.suggestions !== null) {
        return { kind: "answered", sent: query.data?.sent ?? draft.suggestions.length };
    }
    if (labels === 0) {
        return { kind: "answered", sent: 0 };
    }
    if (!consent) {
        return { kind: "failed", reason: "aiOff" };
    }
    if (query.data && !query.data.answer.ok) {
        return { kind: "failed", reason: query.data.answer.reason };
    }
    return query.isError ? { kind: "failed", reason: "providerError" } : { kind: "asking" };
}

function useSuggestions(draft: Draft, model: FileModel, store: DraftStore) {
    const { ledger } = useDashboard();
    const consent = useAiConsent();
    // Smart fill off means nothing is sent to classify, the same promise the app keeps.
    const labels = metaFlag(useMeta(), "aiEnrichment", true) ? unplaced(model) : [];
    const wanted = draft.step === "resolve" && draft.suggestions === null && consent && labels.length > 0;
    const query = useQuery({
        enabled: wanted,
        queryFn: async () => {
            const answer = await askSuggestions(labels, ledger.books);
            // The draft may have been cancelled or replaced while the model thought about it.
            if (answer.ok && store.snapshot().draft?.id === draft.id) {
                store.change({ suggestions: answer.suggestions });
            }
            return { answer, sent: labels.length };
        },
        queryKey: ["import-suggestions", draft.id],
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
    });
    const retry = () => {
        void query.refetch();
    };
    return { retry, status: aiStatus({ consent, draft, labels: labels.length, query }) };
}

function Wizard({
    draft,
    onCancel,
    onDifferentFile,
    onFinished,
    restored,
    store,
}: {
    draft: Draft;
    onCancel: () => void;
    onDifferentFile: () => void;
    onFinished: (finished: Finished) => void;
    restored: boolean;
    store: DraftStore;
}) {
    const model = useFileModel(draft, NO_ASKED);
    const ai = useSuggestions(draft, model, store);
    const runImport = useRunImport();
    const [run, setRun] = useState<Run>({ kind: "idle" });

    if (draft.step === "match") {
        return <MatchStep draft={draft} onCancel={onCancel} onDifferentFile={onDifferentFile} store={store} />;
    }
    if (draft.step === "resolve") {
        return (
            <ResolveStep
                ai={ai.status}
                draft={draft}
                model={model}
                onCancel={onCancel}
                onRetryAi={ai.retry}
                onTurnOnAi={allowAi}
                store={store}
            />
        );
    }
    if (run.kind === "importing") {
        return <ImportingStep draft={draft} model={run.model} />;
    }
    const start = () => {
        // The same rows go again unless review changed since, so batches that landed before the failure aren't doubled.
        if (run.kind === "failed" && run.draft === draft) {
            setRun({ kind: "importing", model: run.model });
            run.retry();
            return;
        }
        store.settle();
        setRun({ kind: "importing", model });
        runImport(draft, model, {
            failed: (retry) => setRun({ draft, kind: "failed", model, retry }),
            saved: (finished) => {
                store.clear();
                onFinished(finished);
            },
        });
    };
    return (
        <ReviewStep
            draft={draft}
            failed={run.kind === "failed"}
            model={model}
            onCancel={onCancel}
            onImport={start}
            onStartOver={onDifferentFile}
            restored={restored}
            store={store}
        />
    );
}

const draftSource = (handed: HandOff["source"]): DraftSource => (handed === "notion" ? "notion" : "csv");

export function FileImport({ kind }: { kind: Kind }) {
    const navigate = useNavigate();
    const { ledger } = useDashboard();
    const store = useDraftStore();
    const { draft, restored } = useDraft(store);
    const [upload, setUpload] = useState<Upload>({ kind: "idle" });
    const [finished, setFinished] = useState<Finished | null>(null);
    const [handed] = useState(peekHandOff);
    const reading = useRef(0);

    const toKind = (next: Kind) => navigate({ replace: true, search: { kind: next }, to: "/import/file" });

    const read = async (file: File, source: DraftSource) => {
        if (!store) {
            return;
        }
        const pdf = isPdf(file);
        if (pdf && kind !== "pdf") {
            void toKind("pdf");
        }
        if (pdf && !hasAiConsent()) {
            setUpload({ file, kind: "problem", problem: "aiOff" });
            return;
        }
        reading.current += 1;
        const turn = reading.current;
        setUpload({ file, kind: "reading", phase: pdf ? "uploading" : "reading" });
        const outcome = await readImportFile(file, {
            ledger,
            onPhase: (phase) => turn === reading.current && setUpload({ file, kind: "reading", phase }),
            source,
            today: ledger.today,
        });
        if (turn !== reading.current) {
            return;
        }
        if (!outcome.ok) {
            setUpload({ file, kind: "problem", problem: outcome.problem });
            return;
        }
        setUpload({ kind: "idle" });
        setFinished(null);
        store.start(outcome.draft);
    };

    // A file dropped on the home page starts reading here once; a query runs it outside render without an effect.
    useQuery({
        enabled: handed !== null && store !== null,
        gcTime: 0,
        queryFn: async () => {
            const taken = takeHandOff();
            if (taken) {
                await read(taken.file, draftSource(taken.source));
            }
            return true;
        },
        queryKey: ["import-hand-off", handed?.file.name, handed?.file.lastModified, handed?.file.size],
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
    });

    const reset = () => {
        reading.current += 1;
        setUpload({ kind: "idle" });
    };
    const cancel = () => {
        reset();
        store?.clear();
        return navigate({ to: "/import" });
    };

    if (finished) {
        return (
            <DoneStep
                finished={finished}
                onAnother={() => {
                    setFinished(null);
                    reset();
                }}
            />
        );
    }
    if (draft && store) {
        return (
            <Wizard
                draft={draft}
                onCancel={cancel}
                onDifferentFile={() => {
                    reset();
                    store.clear();
                }}
                onFinished={setFinished}
                restored={restored}
                store={store}
            />
        );
    }
    return (
        <UploadStep
            kind={kind}
            onCancel={cancel}
            onCsvInstead={() => {
                reset();
                void toKind("csv");
            }}
            onFile={(file) => {
                void read(file, "csv");
            }}
            onKind={(next) => {
                reset();
                void toKind(next);
            }}
            onTurnOnAi={(file) => {
                allowAi();
                void read(file, "csv");
            }}
            upload={upload}
        />
    );
}
