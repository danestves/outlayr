import { decimalsFor } from "@outlayr/money/currency";
import { accountLook } from "@outlayr/money/ledger-log";
import { useEventListener, useOnUnmount, useWhen } from "@outlayr/shared/lifecycle";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Sheet } from "panelui-web/sheet";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { AiConsentActions, AiConsentPrompt } from "@/components/dashboard/ai-consent-prompt";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile, MerchantTile } from "@/components/ledger/tiles";
import { parseAmount } from "@/lib/account-writes";
import { allowAi, useAiConsent } from "@/lib/ai-consent";
import { NEUTRAL_COLOR } from "@/lib/dashboard-series-ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { ledgerToday, promptLedger, resolveVoiceDraft } from "@/lib/voice-entry";
import type { ResolvedVoiceDraft } from "@/lib/voice-entry";
import { convexVoiceTransport, createVoiceTake } from "@/lib/voice-take";
import type { VoiceFailure, VoiceTake } from "@/lib/voice-take";

import { useCategoryName } from "../home/format";
import { useWide } from "../insights/use-wide";
import { useAddEntry, useRepeatNames } from "./entry-form";
import { useAddTransfer } from "./transfer-dialog";
import { useWeekday } from "./use-day-title";

function Line({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="border-border text-app-body flex min-h-11 w-full items-center gap-3 border-b py-2">
            <span className="text-muted-foreground w-24 shrink-0 text-left">{label}</span>
            <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">{children}</span>
        </div>
    );
}

const LINKED_FAILURE = { notEntitled: "/settings/plan", quotaExceeded: "/settings/usage" } as const;

function Consent({ onAllow, onClose }: { onAllow: () => void; onClose: () => void }) {
    const voice = useIntlayer("dashboard-voice");
    return (
        <>
            <Sheet.Body className="pt-2">
                <AiConsentPrompt feature={voice.title} fine={voice.fine} sends={voice.voiceSends} />
            </Sheet.Body>
            <Sheet.Footer className="flex-row *:flex-1">
                <AiConsentActions onAllow={onAllow} onDecline={onClose} />
            </Sheet.Footer>
        </>
    );
}

function Review({ heard, resolved }: { heard: string; resolved: ResolvedVoiceDraft }) {
    const { ledger } = useDashboard();
    const voice = useIntlayer("dashboard-voice");
    const { detail, form } = useIntlayer("dashboard-transactions");
    const { transactions: columns } = useIntlayer("dashboard-home");
    const { money } = useDisplayFormat();
    const categoryName = useCategoryName();
    const repeatNames = useRepeatNames();
    const weekday = useWeekday();
    const day = weekday(resolved.values.dateText.slice(0, 10));
    const accountOf = (id: string | null) => ledger.books.accounts.find((row) => row.localId === id);
    const quote = <p className="text-muted-foreground text-app-label">“{heard}”</p>;
    if (resolved.kind === "transfer") {
        const { values } = resolved;
        const sent = parseAmount(values.sentText, decimalsFor(resolved.currency)) ?? 0;
        const side = (id: string | null) => {
            const account = accountOf(id);
            return account ? (
                <>
                    <AccountTile account={accountLook(account)} size="sm" />
                    <span className="truncate font-medium">{account.name}</span>
                </>
            ) : (
                <span className="text-muted-foreground">{columns.noAccount}</span>
            );
        };
        return (
            <>
                {quote}
                <div className="text-app-figure mt-4 font-mono font-semibold tabular-nums">
                    {money(sent, resolved.currency)}
                </div>
                <div className="mt-3">
                    <Line label={detail.from}>{side(values.fromId)}</Line>
                    <Line label={detail.to}>{side(values.toId)}</Line>
                    <Line label={form.date}>
                        <span className="font-medium">{day}</span>
                    </Line>
                    {values.note.trim() ? (
                        <Line label={detail.note}>
                            <span className="text-muted-foreground">{values.note}</span>
                        </Line>
                    ) : null}
                </div>
            </>
        );
    }
    const { values } = resolved;
    const category = ledger.books.categories.find((row) => row.localId === values.categoryId);
    const parent = category?.parentId ? ledger.books.categories.find((row) => row.localId === category.parentId) : null;
    const dot = (parent ?? category)?.color ?? NEUTRAL_COLOR;
    const account = accountOf(values.accountId);
    const amount = parseAmount(values.amountText, decimalsFor(values.currency)) ?? 0;
    const merchant = values.note || (category?.name ?? "");
    return (
        <>
            {quote}
            <div className="mt-4 flex items-center gap-3">
                <MerchantTile name={merchant} size="xl" />
                <span className="min-w-0">
                    <span className="text-app-title block truncate font-semibold">{merchant}</span>
                    <span className="text-muted-foreground text-app-label block truncate">{day}</span>
                </span>
            </div>
            <div
                className={`text-app-figure mt-4 font-mono font-semibold tabular-nums ${values.income ? "text-app-income" : ""}`}
            >
                {money(values.income ? amount : -amount, values.currency, "always")}
            </div>
            <div className="mt-3">
                <Line label={columns.columns.category}>
                    {category?.name ? (
                        <>
                            <span
                                aria-hidden
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: dot }}
                            />
                            <span className="truncate font-medium">
                                {categoryName({ id: category.localId, name: category.name })}
                            </span>
                        </>
                    ) : (
                        <span className="text-muted-foreground truncate">
                            {resolved.newCategory ? `${resolved.newCategory} · ${voice.newCategory.value}` : form.none}
                        </span>
                    )}
                </Line>
                <Line label={columns.columns.account}>
                    {account ? <AccountTile account={accountLook(account)} size="sm" /> : null}
                    <span className="truncate font-medium">{account?.name ?? columns.noAccount}</span>
                </Line>
                <Line label={form.currency}>
                    <span className="font-medium">{values.currency}</span>
                </Line>
                <Line label={form.repeat}>
                    <span className="text-muted-foreground">
                        {Object.entries(repeatNames).find(([type]) => Number(type) === values.recurringType)?.[1]}
                    </span>
                </Line>
                {values.details.trim() ? (
                    <Line label={detail.note}>
                        <span className="text-muted-foreground">{values.details}</span>
                    </Line>
                ) : null}
            </div>
        </>
    );
}

function useVoiceTake(start: boolean) {
    const committer = useLedgerCommitter();
    const { locale } = useLocale();
    const [take] = useState<VoiceTake>(() =>
        createVoiceTake(convexVoiceTransport(), () => {
            const ledger = committer.current();
            return {
                currency: ledger.currency,
                language: locale,
                ledger: promptLedger(ledger.books),
                today: ledgerToday(ledger, Date.now()),
            };
        })
    );
    const phase = useSyncExternalStore(take.subscribe, take.snapshot, take.snapshot);
    useWhen(start, () => {
        take.start();
    });
    // A hidden tab keeps the mic open, so the take ends with what it heard.
    useEventListener(
        (listener) => {
            document.addEventListener("visibilitychange", listener);
            return () => document.removeEventListener("visibilitychange", listener);
        },
        () => {
            if (document.visibilityState === "hidden") {
                take.finish();
            }
        }
    );
    useOnUnmount(() => take.dispose());
    return { phase, take };
}

function VoiceBody({ onClose }: { onClose: () => void }) {
    const { ledger } = useDashboard();
    const { open } = useAccountFlows();
    const voice = useIntlayer("dashboard-voice");
    const consented = useAiConsent();
    const { phase, take } = useVoiceTake(consented);
    const addEntry = useAddEntry();
    const addTransfer = useAddTransfer();
    const resolved = useMemo(
        () => (phase.kind === "review" ? resolveVoiceDraft(ledger, phase.sent, phase.draft, phase.at) : null),
        [ledger, phase]
    );
    if (!consented) {
        return <Consent onAllow={allowAi} onClose={onClose} />;
    }
    const toForm = (draft: ResolvedVoiceDraft) => {
        onClose();
        open(draft.kind === "entry" ? { kind: "entry", seed: draft.values } : { kind: "transfer", seed: draft.values });
    };
    const save = (draft: ResolvedVoiceDraft) => {
        const problem = draft.kind === "entry" ? addEntry(draft.values) : addTransfer(draft.values);
        if (problem === null) {
            onClose();
        } else {
            toForm(draft);
        }
    };
    const failure = (reason: VoiceFailure) => voice.failed[reason];
    let status: ReactNode = null;
    let body: ReactNode = null;
    let foot: ReactNode = null;
    const retry = (
        <Button onClick={take.start} size="lg">
            {voice.action.retry}
        </Button>
    );
    switch (phase.kind) {
        case "idle": {
            foot = retry;
            break;
        }
        case "starting": {
            status = voice.state.starting;
            body = <p className="text-muted-foreground text-app-label">{voice.hint}</p>;
            break;
        }
        case "listening": {
            status = voice.state.listening;
            body =
                phase.partial === "" ? (
                    <p className="text-muted-foreground text-app-label">{voice.hint}</p>
                ) : (
                    <p className="text-app-title font-medium">{phase.partial}</p>
                );
            foot = (
                <Button onClick={take.finish} size="lg">
                    {voice.action.stop}
                </Button>
            );
            break;
        }
        case "sending": {
            status = voice.state.thinking;
            body = phase.text ? <p className="text-app-title font-medium">{phase.text}</p> : null;
            break;
        }
        case "failed": {
            status = failure(phase.reason);
            body = phase.heard ? <p className="text-muted-foreground text-app-label">“{phase.heard}”</p> : null;
            const linked = phase.reason === "notEntitled" || phase.reason === "quotaExceeded" ? phase.reason : null;
            foot = (
                <>
                    {linked ? (
                        <Button render={<Link onClick={onClose} to={LINKED_FAILURE[linked]} />} variant="outline">
                            {linked === "notEntitled" ? voice.action.plan : voice.action.usage}
                        </Button>
                    ) : null}
                    {retry}
                </>
            );
            break;
        }
        case "review": {
            if (resolved === null) {
                break;
            }
            const gaps = resolved.gaps.length > 0;
            status = gaps ? voice.needsForm : null;
            body = <Review heard={phase.heard} resolved={resolved} />;
            foot = (
                <>
                    <div className="flex flex-row gap-2 *:flex-1">
                        <Button onClick={take.start} variant="outline">
                            {voice.action.retry}
                        </Button>
                        <Button onClick={() => toForm(resolved)} variant="outline">
                            {voice.action.edit}
                        </Button>
                    </div>
                    <Button onClick={() => (gaps ? toForm(resolved) : save(resolved))} size="lg">
                        {gaps ? voice.action.finish : voice.action.save}
                    </Button>
                </>
            );
            break;
        }
        default: {
            break;
        }
    }
    return (
        <>
            <Sheet.Body className="flex flex-col gap-3 pt-2">
                <p aria-live="polite" className="text-app-body min-h-6 font-medium">
                    {status}
                </p>
                {body}
            </Sheet.Body>
            {foot ? <Sheet.Footer>{foot}</Sheet.Footer> : null}
        </>
    );
}

/** The phone's voice flow on the web: nothing saves until Save, and Edit hands the draft to the form. */
export function VoiceSheet({ onClose, open }: { onClose: () => void; open: boolean }) {
    const wide = useWide();
    const voice = useIntlayer("dashboard-voice");
    return (
        <Sheet onOpenChange={(next) => (next ? undefined : onClose())} open={open} side={wide ? "right" : "bottom"}>
            <Sheet.Content className="app-shell ph-no-capture" showGrabber={false} size={wide ? "auto" : "full"}>
                {wide ? (
                    <>
                        <Sheet.Close aria-label={voice.close.value} className="absolute end-4 top-4 z-10" />
                        <Sheet.Header className="pe-14" title={voice.title} />
                    </>
                ) : (
                    <Sheet.Header>
                        <Sheet.Close aria-label={voice.close.value} />
                        <Sheet.Title>{voice.title}</Sheet.Title>
                    </Sheet.Header>
                )}
                {open ? <VoiceBody onClose={onClose} /> : null}
            </Sheet.Content>
        </Sheet>
    );
}
