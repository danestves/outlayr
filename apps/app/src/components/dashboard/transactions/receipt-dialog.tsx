import File01Icon from "@hugeicons/core-free-icons/File01Icon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEventListener, useOnMount } from "@outlayr/shared/lifecycle";
import { Alert } from "panelui-web/alert";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { FlowDialog } from "@/components/dashboard/accounts/fields";
import type { AccountFlow } from "@/components/dashboard/accounts/flows";
import { AiConsentActions, AiConsentPrompt } from "@/components/dashboard/ai-consent-prompt";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { allowAi, hasAiConsent } from "@/lib/ai-consent";
import { isReceiptFile, receiptImage, scanReceipt, scannedEntry } from "@/lib/receipt-scan";
import type { ScanFailure } from "@/lib/receipt-scan";

type Phase =
    | { file: File | null; kind: "consent" }
    | { kind: "pick" }
    | { file: File; kind: "preparing" }
    | { file: File; kind: "reading" }
    | { file: File | null; kind: "failed"; reason: ScanFailure };

const SECOND_TRY: ReadonlySet<ScanFailure> = new Set(["offline", "providerError", "invalidResponse", "rateLimited"]);

const fileIn = (items: Iterable<{ getAsFile?: () => File | null }> | FileList | null) => {
    for (const item of items ?? []) {
        const file = item instanceof File ? item : item.getAsFile?.();
        if (file && isReceiptFile(file)) {
            return file;
        }
    }
    return null;
};

function FileBox({ file }: { file: File }) {
    return (
        <div className="bg-muted/40 text-app-label rounded-app-lg flex h-28 items-center justify-center gap-2 border px-4">
            <HugeiconsIcon className="text-muted-foreground flex-none" icon={File01Icon} size={18} />
            <span className="truncate">{file.name}</span>
        </div>
    );
}

/** Where the scan is, as words that change in place. Nothing loops while the provider reads. */
function Steps({ phase }: { phase: "preparing" | "reading" }) {
    const { preparing, reading } = useIntlayer("dashboard-receipt");
    const steps = [
        { done: phase === "reading", key: "preparing", label: preparing },
        { done: false, key: "reading", label: reading },
    ] as const;
    return (
        <ol aria-live="polite" className="text-app-label flex flex-col gap-1.5">
            {steps.map((step) => {
                const current = step.key === phase;
                return (
                    <li
                        className={`flex items-center gap-2 ${current || step.done ? "" : "text-muted-foreground"}`}
                        key={step.key}
                    >
                        <span aria-hidden className="flex size-4 items-center justify-center">
                            {step.done ? (
                                <HugeiconsIcon className="text-app-tint" icon={Tick02Icon} size={16} />
                            ) : (
                                <i className={`size-1.5 rounded-full ${current ? "bg-foreground" : "bg-border"}`} />
                            )}
                        </span>
                        {step.label}
                    </li>
                );
            })}
        </ol>
    );
}

function DropZone({ onChoose, onFile }: { onChoose: () => void; onFile: (file: File) => void }) {
    const { choose, drop, intro, limit } = useIntlayer("dashboard-receipt");
    const [over, setOver] = useState(false);
    return (
        <div
            className={`rounded-app-lg flex h-[220px] flex-col items-center justify-center border border-dashed px-6 text-center transition-colors ${over ? "border-primary bg-primary/5" : "bg-muted/30"}`}
            onDragLeave={() => setOver(false)}
            onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
            }}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const file = fileIn(event.dataTransfer.files);
                if (file) {
                    onFile(file);
                }
            }}
        >
            <HugeiconsIcon className="text-muted-foreground" icon={ImageAdd01Icon} size={24} />
            <p className="text-app-label mt-2.5 font-medium">{intro}</p>
            <p className="text-app-caption text-muted-foreground mt-1">
                {drop} · {limit}
            </p>
            <Button className="mt-4" onClick={onChoose} size="sm" variant="outline">
                {choose}
            </Button>
        </div>
    );
}

export function ReceiptDialog({
    flow,
    onClose,
    onSwitch,
}: {
    flow: Extract<AccountFlow, { kind: "receipt" }>;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const committer = useLedgerCommitter();
    const { locale } = useLocale();
    const words = useIntlayer("dashboard-receipt");
    const { cancel } = useIntlayer("dashboard-accounts").flows;
    const input = useRef<HTMLInputElement>(null);
    const latest = useRef(0);
    const mounted = useRef(false);
    const started = useRef(false);
    const [phase, setPhase] = useState<Phase>(() => {
        if (!hasAiConsent()) {
            return { file: flow.file ?? null, kind: "consent" };
        }
        return flow.file ? { file: flow.file, kind: "preparing" } : { kind: "pick" };
    });

    const failures = {
        invalid: words.failed.provider,
        invalidResponse: words.failed.provider,
        notConfigured: words.failed.notConfigured,
        notEntitled: words.failed.notEntitled,
        offline: words.failed.offline,
        providerError: words.failed.provider,
        quotaExceeded: words.failed.quotaExceeded,
        rateLimited: words.failed.rateLimited,
        tooBig: words.failed.tooBig,
        unauthenticated: words.failed.unauthenticated,
        unclear: words.failed.unclear,
        unreadable: words.failed.unreadable,
    } satisfies Record<ScanFailure, ReactNode>;

    const byHand = () => onSwitch({ accountId: flow.accountId, kind: "entry" });

    const read = async (file: File) => {
        // Consent is checked again here: Settings can take it back while this dialog is open.
        if (!hasAiConsent()) {
            setPhase({ file, kind: "consent" });
            return;
        }
        latest.current += 1;
        const run = latest.current;
        const live = () => mounted.current && latest.current === run;
        setPhase({ file, kind: "preparing" });
        const image = await receiptImage(file);
        if (!live()) {
            return;
        }
        if (!image.ok) {
            setPhase({ file, kind: "failed", reason: image.reason });
            return;
        }
        setPhase({ file, kind: "reading" });
        const ledger = committer.current();
        const result = await scanReceipt(image.image, ledger, locale);
        if (!live()) {
            return;
        }
        if (!result.ok) {
            setPhase({ file, kind: "failed", reason: result.reason });
            return;
        }
        const scanned = scannedEntry(committer.current(), result.draft, {
            accountId: flow.accountId ?? null,
            at: Date.now(),
            fileName: file.name,
        });
        onSwitch({ accountId: flow.accountId, kind: "entry", scanned });
    };

    // A file dropped on the Add form starts once, and a scan still running when the dialog goes must not reopen a flow.
    useOnMount(() => {
        mounted.current = true;
        if (!started.current && phase.kind === "preparing") {
            started.current = true;
            void read(phase.file);
        }
        return () => {
            mounted.current = false;
        };
    });

    const takesFile = phase.kind === "pick" || phase.kind === "failed";
    useEventListener(
        (listener) => {
            window.addEventListener("paste", listener);
            return () => window.removeEventListener("paste", listener);
        },
        (event: ClipboardEvent) => {
            if (!takesFile) {
                return;
            }
            const file = fileIn(event.clipboardData?.items ?? null);
            if (file) {
                event.preventDefault();
                void read(file);
            }
        }
    );

    const choose = () => input.current?.click();
    const stop = () => {
        latest.current += 1;
        setPhase({ kind: "pick" });
    };

    let body: ReactNode = null;
    let footer: ReactNode = null;
    if (phase.kind === "consent") {
        body = (
            <AiConsentPrompt feature={words.consent.feature} fine={words.consent.fine} sends={words.consent.sends} />
        );
        footer = (
            <AiConsentActions
                onAllow={() => {
                    allowAi();
                    if (phase.file) {
                        void read(phase.file);
                    } else {
                        setPhase({ kind: "pick" });
                    }
                }}
                onDecline={byHand}
            />
        );
    } else if (phase.kind === "pick") {
        body = (
            <DropZone
                onChoose={choose}
                onFile={(file) => {
                    void read(file);
                }}
            />
        );
        footer = (
            <>
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button onClick={byHand} variant="secondary">
                    {words.byHand}
                </Button>
            </>
        );
    } else if (phase.kind === "preparing" || phase.kind === "reading") {
        body = (
            <div className="flex flex-col gap-3">
                <FileBox file={phase.file} />
                <Steps phase={phase.kind} />
            </div>
        );
        footer = (
            <Button onClick={stop} variant="secondary">
                {cancel}
            </Button>
        );
    } else {
        const { file, reason } = phase;
        body = (
            <div className="flex flex-col gap-3">
                {file ? <FileBox file={file} /> : null}
                <Alert tone="destructive" variant="plain">
                    <Alert.Icon />
                    <Alert.Title>{failures[reason]}</Alert.Title>
                </Alert>
            </div>
        );
        footer = (
            <>
                <Button className="sm:me-auto" onClick={byHand} variant="secondary">
                    {words.byHand}
                </Button>
                <Button onClick={choose} variant={file && SECOND_TRY.has(reason) ? "secondary" : "default"}>
                    {words.chooseAnother}
                </Button>
                {file && SECOND_TRY.has(reason) ? (
                    <Button
                        onClick={() => {
                            void read(file);
                        }}
                    >
                        {words.retry}
                    </Button>
                ) : null}
            </>
        );
    }

    return (
        <FlowDialog label={words.title}>
            <Dialog.Body>
                {body}
                <input
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(event) => {
                        const file = fileIn(event.target.files);
                        event.target.value = "";
                        if (file) {
                            void read(file);
                        }
                    }}
                    ref={input}
                    type="file"
                />
            </Dialog.Body>
            <Dialog.Footer>{footer}</Dialog.Footer>
        </FlowDialog>
    );
}
