import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Image01Icon from "@hugeicons/core-free-icons/Image01Icon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import type { ScanStatus } from "@outlayr/backend/confect/receiptScan.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { accountLook } from "@outlayr/money/ledger-log";
import { useEventListener, useOnUnmount } from "@outlayr/shared/lifecycle";
import { Alert } from "panelui-web/alert";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Select } from "panelui-web/select";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { AiConsentActions, AiConsentPrompt } from "@/components/dashboard/ai-consent-prompt";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { allowPlanScan, hasPlanScanConsent } from "@/lib/ai-consent";
import { convexClient } from "@/lib/convex";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { scanImage, scannedSeed } from "@/lib/installment-scan";

import { FlowDialog } from "./fields";
import type { AccountFlow } from "./flows";
import { Glyph } from "./glyph";

type Phase =
    | { kind: "consent" | "pick" }
    | { file: File; kind: "reading"; run: number }
    | { file: File; kind: "failed"; message: ReactNode };

function browserRegion() {
    try {
        return new Intl.Locale(navigator.language).region;
    } catch {
        return undefined;
    }
}

const imageIn = (items: Iterable<{ getAsFile?: () => File | null; type: string }> | FileList | null) => {
    for (const item of items ?? []) {
        const file = item instanceof File ? item : item.getAsFile?.();
        if (file && item.type.startsWith("image/")) {
            return file;
        }
    }
    return null;
};

function FileBox({ file }: { file: File }) {
    return (
        <div className="bg-muted/40 text-app-label rounded-app-lg flex h-40 items-center justify-center gap-2 border px-4">
            <Glyph className="text-muted-foreground flex-none" icon={Image01Icon} size={18} />
            <span className="truncate">{file.name}</span>
        </div>
    );
}

function Reading({ file }: { file: File }) {
    const { scan } = useIntlayer("dashboard-installments");
    return (
        <div className="flex flex-col gap-3">
            <FileBox file={file} />
            <output className="text-app-label">{scan.reading}</output>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div className="bg-primary h-full w-[92%] rounded-full transition-[width] duration-[18s] ease-out starting:w-[6%]" />
            </div>
        </div>
    );
}

function DropZone({ onChoose, onFile }: { onChoose: () => void; onFile: (file: File) => void }) {
    const { scan } = useIntlayer("dashboard-installments");
    const [over, setOver] = useState(false);
    return (
        <div
            className={`rounded-app-lg flex h-55 flex-col items-center justify-center border border-dashed px-6 text-center transition-colors ${over ? "border-primary bg-primary/5" : "bg-muted/30"}`}
            onDragLeave={() => setOver(false)}
            onDragOver={(event) => {
                event.preventDefault();
                setOver(true);
            }}
            onDrop={(event) => {
                event.preventDefault();
                setOver(false);
                const file = imageIn(event.dataTransfer.files);
                if (file) {
                    onFile(file);
                }
            }}
        >
            <Glyph className="text-muted-foreground" icon={ImageAdd01Icon} size={24} />
            <p className="text-app-label mt-2.5 font-medium">{scan.intro}</p>
            <p className="text-muted-foreground mt-1 text-xs">{scan.drop}</p>
            <Button className="mt-4" onClick={onChoose} size="sm" variant="outline">
                {scan.choose}
            </Button>
        </div>
    );
}

function AccountPick({
    cards,
    onPick,
    value,
}: {
    cards: ReturnType<typeof openAccounts>;
    onPick: (id: string) => void;
    value: string | null;
}) {
    const { scan } = useIntlayer("dashboard-installments");
    const chosen = cards.find((row) => row.localId === value);
    return (
        <Field>
            <Field.Label>{scan.account}</Field.Label>
            <Select
                items={cards.map((row) => ({ label: row.name, value: row.localId }))}
                onValueChange={(next) => next && onPick(next)}
                value={value}
            >
                <Select.Trigger icon={<Glyph icon={ArrowDown01Icon} size={16} />}>
                    {chosen ? <AccountTile account={accountLook(chosen)} size="sm" /> : null}
                    <Select.Value />
                </Select.Trigger>
                <Select.Content className="app-shell z-60">
                    {cards.map((row) => (
                        <Select.Item key={row.localId} value={row.localId}>
                            {row.name}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Field>
    );
}

export function ScanDialog({
    accountId,
    onClose,
    onSwitch,
}: {
    accountId?: string;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { ledger } = useDashboard();
    const { locale } = useLocale();
    const { cancel, consent, scan } = useIntlayer("dashboard-installments");
    const { flows } = useIntlayer("dashboard-accounts");
    const cards = openAccounts(ledger.books).filter((row) => row.kind === "liability");
    const [picked, setPicked] = useState(
        cards.find((row) => row.localId === accountId)?.localId ?? cards[0]?.localId ?? null
    );
    const [phase, setPhase] = useState<Phase>(() => ({ kind: hasPlanScanConsent() ? "pick" : "consent" }));
    const input = useRef<HTMLInputElement>(null);
    const latest = useRef(0);
    const account = cards.find((row) => row.localId === picked) ?? null;

    const failures = {
        invalid: scan.failed.provider,
        invalidResponse: scan.failed.provider,
        notConfigured: scan.failed.notConfigured,
        notEntitled: scan.failed.notEntitled,
        ok: scan.failed.unclear,
        providerError: scan.failed.provider,
        quotaExceeded: scan.failed.quotaExceeded,
        rateLimited: scan.failed.rateLimited,
        unauthenticated: scan.failed.unauthenticated,
        unclear: scan.failed.unclear,
    } satisfies Record<typeof ScanStatus.Type, ReactNode>;

    const read = async (file: File) => {
        if (!account) {
            return;
        }
        if (!hasPlanScanConsent()) {
            setPhase({ kind: "consent" });
            return;
        }
        latest.current += 1;
        const run = latest.current;
        setPhase({ file, kind: "reading", run });
        const fail = (message: ReactNode) => latest.current === run && setPhase({ file, kind: "failed", message });
        const image = await scanImage(file);
        if (image === null) {
            fail(scan.failed.notImage);
            return;
        }
        const result = await convexClient()
            .action(api.installmentScan.scan, {
                accounts: [account.name],
                aiConsent: AI_CONSENT_VERSION,
                currency: account.currency,
                image,
                language: locale,
                regionCode: browserRegion(),
                today: ledger.today,
            })
            .catch(() => null);
        if (latest.current !== run) {
            return;
        }
        if (result === null) {
            fail(navigator.onLine ? scan.failed.provider : scan.failed.offline);
            return;
        }
        if (result.status !== "ok" || result.plan === null) {
            fail(failures[result.status]);
            return;
        }
        const foreign = result.plan.currency !== null && result.plan.currency !== account.currency;
        if (foreign) {
            fail(
                scan.currency({ account: account.name, currency: account.currency, plan: result.plan.currency ?? "" })
            );
            return;
        }
        const seed = scannedSeed(result.plan, { currency: account.currency, id: account.localId });
        if (seed === null) {
            fail(scan.failed.unclear);
            return;
        }
        onSwitch({ accountId: account.localId, kind: "purchase", seed });
    };

    // A scan still running when the dialog goes must not reopen a flow.
    useOnUnmount(() => {
        latest.current += 1;
    });

    const takesImage = phase.kind === "pick" || phase.kind === "failed";
    useEventListener(
        (listener) => {
            window.addEventListener("paste", listener);
            return () => window.removeEventListener("paste", listener);
        },
        (event: ClipboardEvent) => {
            if (!takesImage) {
                return;
            }
            const file = imageIn(event.clipboardData?.items ?? null);
            if (file) {
                event.preventDefault();
                void read(file);
            }
        }
    );

    const choose = () => input.current?.click();
    const back = () => {
        latest.current += 1;
        setPhase({ kind: "pick" });
    };

    let body: ReactNode = null;
    if (phase.kind === "consent") {
        body = <AiConsentPrompt feature={consent.planScan} fine={consent.fine} sends={consent.planScanSends} />;
    } else if (cards.length === 0) {
        body = <p className="text-muted-foreground text-app-label">{scan.noCard}</p>;
    } else if (phase.kind === "pick") {
        body = (
            <div className="flex flex-col gap-4">
                <AccountPick cards={cards} onPick={setPicked} value={picked} />
                <DropZone
                    onChoose={choose}
                    onFile={(file) => {
                        void read(file);
                    }}
                />
            </div>
        );
    } else if (phase.kind === "reading") {
        body = <Reading file={phase.file} key={phase.run} />;
    } else if (phase.kind === "failed") {
        body = (
            <div className="flex flex-col gap-3">
                <FileBox file={phase.file} />
                <Alert tone="destructive" variant="plain">
                    <Alert.Icon />
                    <Alert.Title>{phase.message}</Alert.Title>
                </Alert>
            </div>
        );
    }

    let footer: ReactNode = (
        <Button onClick={phase.kind === "reading" ? back : onClose} variant="secondary">
            {cancel}
        </Button>
    );
    if (phase.kind === "consent") {
        footer = (
            <AiConsentActions
                onAllow={() => {
                    allowPlanScan();
                    setPhase({ kind: "pick" });
                }}
                onDecline={onClose}
            />
        );
    } else if (cards.length === 0) {
        footer = (
            <>
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button onClick={() => onSwitch({ kind: "create", type: "card" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {flows.cardOrLoan}
                </Button>
            </>
        );
    } else if (phase.kind === "failed") {
        footer = (
            <>
                <Button className="sm:me-auto" onClick={back} variant="secondary">
                    {scan.chooseAccount}
                </Button>
                <Button onClick={onClose} variant="secondary">
                    {cancel}
                </Button>
                <Button onClick={choose}>{scan.choose}</Button>
            </>
        );
    }

    return (
        <FlowDialog label={scan.title}>
            <Dialog.Body>
                {body}
                <input
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                        const file = imageIn(event.target.files);
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
