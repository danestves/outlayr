import { countBucket } from "@outlayr/money/count-bucket";
import { analyzeSnapshot } from "@outlayr/money/money-manager/analysis";
import { defaultChoices } from "@outlayr/money/money-manager/defaults";
import type { MmArchiveError, MmChoices } from "@outlayr/money/money-manager/types";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { usePresetLabel } from "@/components/dashboard/settings/categories/preset-label";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { capture } from "@/lib/analytics";
import { keepImported } from "@/lib/money-manager/extras";
import { outlayrLedgerState } from "@/lib/money-manager/ledger-state";
import { readBackupFile } from "@/lib/money-manager/read-backup";
import { moneyManagerRows, undoMoneyManagerRows } from "@/lib/money-manager/writes";
import type { MoneyManagerImported } from "@/lib/money-manager/writes";

import { takeHandOff } from "../hand-off";
import { importStore } from "../store";
import { Accounts } from "./accounts";
import { Categories } from "./categories";
import { Balances, Budgets, Start, Uncategorized } from "./extras";
import { Done, Failed, Importing } from "./finish";
import { Intro, Reading, WrongFile } from "./intro";
import { budgetsFit, planOf } from "./model";
import type { Draft, Screen } from "./model";
import { Overview } from "./overview";

type Phase =
    | { kind: "intro" }
    | { kind: "reading"; name: string; size: number }
    | { kind: "wrong"; error: MmArchiveError; name: string; size: number }
    | { kind: "review"; draft: Draft; screen: Screen }
    | { kind: "importing"; draft: Draft }
    | { kind: "failed"; draft: Draft; retry: () => void }
    | { kind: "done"; at: number; entryCount: number; imported: MoneyManagerImported; undone: boolean };

const nowMs = () => Date.now();

export function MoneyManagerImport() {
    const navigate = useNavigate();
    const dashboard = useDashboard();
    const committer = useLedgerCommitter();
    const presetLabel = usePresetLabel();
    const userId = useMatch({ from: "/_account/app", select: (match) => match.loaderData?.userId });
    const [phase, setPhase] = useState<Phase>({ kind: "intro" });
    const record = useRef<string | null>(null);

    const leave = () => navigate({ to: "/app/import" });

    const read = async (file: File) => {
        setPhase({ kind: "reading", name: file.name, size: file.size });
        const reading = await readBackupFile(file);
        if (!reading.ok) {
            setPhase({ error: reading.error, kind: "wrong", name: file.name, size: file.size });
            return;
        }
        const ledger = outlayrLedgerState(dashboard.ledger, presetLabel);
        const analysis = analyzeSnapshot(reading.snapshot, ledger);
        const base = defaultChoices(reading.snapshot, analysis, ledger);
        const choices: MmChoices = budgetsFit(reading.snapshot, ledger) ? base : { ...base, budgets: {} };
        setPhase({
            draft: { analysis, choices, ledger, name: file.name, size: file.size, snapshot: reading.snapshot },
            kind: "review",
            screen: analysis.overlap === null ? "overview" : "start",
        });
    };

    const handed = useRef(false);
    // A File can't travel in a URL, so the file the Import home dropped is read once on mount.
    // oxlint-disable-next-line outlayr/react-effect-budget
    useEffect(() => {
        if (handed.current) {
            return;
        }
        handed.current = true;
        const file = takeHandOff()?.file;
        if (file) {
            // oxlint-disable-next-line react/set-state-in-effect -- the file is already in hand, nothing to wait on
            void read(file);
        }
    });

    const run = async (draft: Draft) => {
        setPhase({ draft, kind: "importing" });
        const plan = planOf(draft);
        const at = nowMs();
        const { imported, rows } = moneyManagerRows(dashboard.ledger, plan, at);
        await land(draft, plan, at, imported, rows);
    };

    const land = async (
        draft: Draft,
        plan: ReturnType<typeof planOf>,
        at: number,
        imported: MoneyManagerImported,
        rows: ReturnType<typeof moneyManagerRows>["rows"]
    ) => {
        if (!(await committer.commit(rows))) {
            // Pushes go in batches, so earlier ones may have landed; resending the same rows can't double them.
            const retry = () => {
                setPhase({ draft, kind: "importing" });
                void land(draft, plan, at, imported, rows);
            };
            setPhase({ draft, kind: "failed", retry });
            return;
        }
        const { defaultCurrency } = draft.snapshot;
        const counted = plan.entries.filter((entry) => entry.currency === defaultCurrency);
        const sum = (income: boolean) =>
            counted.filter((entry) => entry.income === income).reduce((total, entry) => total + entry.amount, 0);
        const id = crypto.randomUUID();
        record.current = id;
        keepImported(id, imported);
        if (userId !== undefined) {
            importStore(userId).add({
                accountIds: [...new Set(Object.values(imported.accountKeys))],
                at,
                createdAccountIds: [...imported.accountIds],
                createdCategoryIds: [...imported.categoryIds],
                currency: defaultCurrency,
                duplicates: draft.choices.start.kind === "skipMatches" ? (draft.analysis.overlap?.matches ?? 0) : 0,
                entryIds: [...imported.entryIds],
                id,
                in: sum(true),
                inCount: counted.filter((entry) => entry.income).length,
                name: draft.name,
                out: sum(false),
                outCount: counted.filter((entry) => !entry.income).length,
                source: "moneyManager",
                statement: null,
                undoneAt: null,
            });
        }
        const entryCount = imported.entryIds.length + imported.transferIds.length;
        capture("import_finished", { rows: countBucket(entryCount), source: "money_manager" });
        setPhase({
            at,
            entryCount,
            imported,
            kind: "done",
            undone: false,
        });
    };

    const undo = async (imported: MoneyManagerImported) => {
        const { rows } = undoMoneyManagerRows(dashboard.ledger, imported, Date.now());
        if (!(await committer.commit(rows))) {
            return false;
        }
        if (userId !== undefined && record.current !== null) {
            importStore(userId).change(record.current, { undoneAt: Date.now() });
        }
        setPhase((current) => (current.kind === "done" ? { ...current, undone: true } : current));
        return true;
    };

    const edit = (draft: Draft, screen: Screen) => ({
        onBack: () => setPhase({ draft, kind: "review", screen: "overview" }),
        onChoices: (choices: MmChoices) => setPhase({ draft: { ...draft, choices }, kind: "review", screen }),
    });

    switch (phase.kind) {
        case "intro": {
            return <Intro onCancel={leave} onFile={read} />;
        }
        case "reading": {
            return <Reading name={phase.name} onCancel={leave} size={phase.size} />;
        }
        case "wrong": {
            return <WrongFile error={phase.error} name={phase.name} onCancel={leave} onFile={read} size={phase.size} />;
        }
        case "importing": {
            return <Importing draft={phase.draft} />;
        }
        case "failed": {
            return (
                <Failed
                    onBack={() => setPhase({ draft: phase.draft, kind: "review", screen: "overview" })}
                    onRetry={phase.retry}
                />
            );
        }
        case "done": {
            return (
                <Done
                    at={phase.at}
                    entryCount={phase.entryCount}
                    imported={phase.imported}
                    onUndo={() => undo(phase.imported)}
                    undone={phase.undone}
                />
            );
        }
        default: {
            const { draft, screen } = phase;
            const shared = { draft, ...edit(draft, screen) };
            switch (screen) {
                case "accounts": {
                    return <Accounts {...shared} />;
                }
                case "balances": {
                    return <Balances {...shared} />;
                }
                case "budgets": {
                    return <Budgets {...shared} />;
                }
                case "categories": {
                    return <Categories {...shared} />;
                }
                case "uncategorized": {
                    return <Uncategorized {...shared} />;
                }
                case "start": {
                    return (
                        <Start
                            draft={draft}
                            onChoices={shared.onChoices}
                            onDone={() => setPhase({ draft, kind: "review", screen: "overview" })}
                        />
                    );
                }
                default: {
                    return (
                        <Overview
                            draft={draft}
                            onCancel={() => setPhase({ kind: "intro" })}
                            onImport={() => run(draft)}
                            onOpen={(next) => setPhase({ draft, kind: "review", screen: next })}
                        />
                    );
                }
            }
        }
    }
}
