import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
import Undo02Icon from "@hugeicons/core-free-icons/Undo02Icon";
import { Link } from "@tanstack/react-router";
import { AlertDialog } from "panelui-web/alert-dialog";
import { Button } from "panelui-web/button";
import { Table } from "panelui-web/table";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows } from "@/components/dashboard/accounts/model";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LookTile } from "@/components/ledger/tiles";
import { money } from "@/lib/ledger";
import type { MoneyManagerImported } from "@/lib/money-manager/writes";

import { Banner, Card, Columns, ImportPage } from "../parts";
import { fill, planOf, planSize } from "./model";
import type { Draft } from "./model";
import { Figures, MmBar } from "./parts";

const CENT = 0.005;

export function Importing({ draft }: { draft: Draft }) {
    const { importing } = useIntlayer("dashboard-import-mm");
    const plan = planOf(draft);
    const steps = [
        [importing.accounts, plan.accounts.length],
        [importing.categories, plan.categories.length],
        ...(plan.budgets.length > 0 ? [[importing.budgets, plan.budgets.length] as const] : []),
        [importing.entries, planSize(plan)],
    ] as const;
    return (
        <ImportPage>
            <MmBar title={importing.heading}>
                <Button disabled>{importing.title}</Button>
            </MmBar>
            <Columns
                rail={
                    <Card title={importing.steps}>
                        <ul className="divide-border divide-y">
                            {steps.map(([label, count]) => (
                                <li
                                    className="flex min-h-9 items-center justify-between gap-3 px-4 text-[13px]"
                                    key={label.value}
                                >
                                    <span className="text-muted-foreground">{label}</span>
                                    <span className="dash-figure">{count.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                }
            >
                <Card title={importing.writing}>
                    <div className="p-5">
                        <div className="flex h-105 items-center justify-center rounded-xl border px-4 text-center text-sm">
                            {fill(importing.body.value, { n: planSize(plan).toLocaleString() })}
                        </div>
                    </div>
                </Card>
            </Columns>
        </ImportPage>
    );
}

export function Failed({ onBack, onRetry }: { onBack: () => void; onRetry: () => void }) {
    const { failed } = useIntlayer("dashboard-import-mm");
    return (
        <ImportPage>
            <MmBar title={failed.title} />
            <Card>
                <Banner
                    action={
                        <span className="flex gap-2">
                            <Button onClick={onBack} size="sm" variant="outline">
                                {failed.back}
                            </Button>
                            <Button onClick={onRetry} size="sm">
                                {failed.retry}
                            </Button>
                        </span>
                    }
                    title={failed.title}
                    tone="bad"
                >
                    {failed.body}
                </Banner>
            </Card>
        </ImportPage>
    );
}

interface DoneProps {
    at: number;
    entryCount: number;
    imported: MoneyManagerImported;
    onUndo: () => Promise<boolean>;
    undone: boolean;
}

export function Done({ at, entryCount, imported, onUndo, undone }: DoneProps) {
    const { bar, done } = useIntlayer("dashboard-import-mm");
    const date = useDateFormat();
    const { ledger, overview } = useDashboard();
    const [asking, setAsking] = useState(false);
    const [failed, setFailed] = useState(false);
    const rows = accountRows(ledger, overview);
    const checks = Object.entries(imported.expectedBalances).flatMap(([id, expected]) => {
        const row = rows.find((candidate) => candidate.id === id);
        return row ? [{ expected, row }] : [];
    });
    const matching = checks.filter(({ expected, row }) => Math.abs(row.balance - expected) < CENT).length;
    const day = date.day(new Date(at).toISOString().slice(0, 10));
    const confirm = async () => {
        setFailed(false);
        const ok = await onUndo();
        setAsking(false);
        setFailed(!ok);
    };
    if (undone) {
        return (
            <ImportPage>
                <MmBar title={done.undone}>
                    <Button render={<Link to="/transactions" />} size="sm">
                        {done.openTransactions}
                    </Button>
                </MmBar>
            </ImportPage>
        );
    }
    return (
        <ImportPage>
            <MmBar title={fill(done.movedIn.value, { day })}>
                <Button render={<Link to="/transactions" />} size="sm">
                    {done.openTransactions}
                </Button>
            </MmBar>
            <Figures
                items={[
                    { label: done.entries, value: entryCount },
                    { label: done.accounts, value: imported.accountIds.length },
                    { label: done.categories, value: imported.categoryIds.length },
                    ...(imported.budgetIds.length > 0
                        ? [{ label: done.budgets, value: imported.budgetIds.length }]
                        : []),
                ]}
            />
            <Columns
                rail={
                    <Card title={done.undoTitle}>
                        <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">
                            {fill(done.undoBody.value, { day, n: entryCount.toLocaleString() })}
                        </p>
                        <div className="px-4 pb-4">
                            <Button
                                className="w-full gap-1.5"
                                onClick={() => setAsking(true)}
                                size="sm"
                                variant="outline"
                            >
                                <Glyph icon={Undo02Icon} size={14} />
                                {done.undo}
                            </Button>
                        </div>
                    </Card>
                }
            >
                {failed ? <Banner title={done.undoFailed} tone="bad" /> : null}
                {checks.length > 0 ? (
                    <Card
                        action={
                            matching === checks.length ? (
                                <span className="text-app-income flex items-center gap-1.5 text-xs">
                                    <span aria-hidden className="bg-app-income size-1.5 rounded-full" />
                                    {done.matchesMm}
                                </span>
                            ) : undefined
                        }
                        title={
                            matching === checks.length
                                ? fill(done.balancesAll.value, { n: checks.length })
                                : fill(done.balancesSome.value, { n: matching, total: checks.length })
                        }
                    >
                        <DataTable head={[done.account, done.shows, done.inOutlayr, ""]} numbers={2}>
                            {checks.map(({ expected, row }) => {
                                const ok = Math.abs(row.balance - expected) < CENT;
                                return (
                                    <Table.Row key={row.id}>
                                        <Cell>
                                            <span className="flex items-center gap-2.5">
                                                <LookTile look={row.look} />
                                                <span className="truncate">{row.name}</span>
                                            </span>
                                        </Cell>
                                        <Cell figure>{money(expected, row.currency)}</Cell>
                                        <Cell figure>{money(row.balance, row.currency)}</Cell>
                                        <Cell>
                                            <Glyph
                                                className={ok ? "text-app-income" : "text-app-tint"}
                                                icon={ok ? CheckmarkCircle02Icon : Alert02Icon}
                                                size={16}
                                            />
                                        </Cell>
                                    </Table.Row>
                                );
                            })}
                        </DataTable>
                    </Card>
                ) : (
                    <Card>
                        <p className="text-muted-foreground px-4 py-3 text-[13px]">{done.noCheck}</p>
                    </Card>
                )}
            </Columns>
            <AlertDialog onOpenChange={setAsking} open={asking}>
                <AlertDialog.Content className="app-shell" tone="destructive">
                    <AlertDialog.Title>{done.undoConfirm}</AlertDialog.Title>
                    <AlertDialog.Description>
                        {fill(done.undoBody.value, { day, n: entryCount.toLocaleString() })}
                    </AlertDialog.Description>
                    <AlertDialog.Footer>
                        <AlertDialog.Cancel>{bar.cancel}</AlertDialog.Cancel>
                        <AlertDialog.Action onClick={confirm}>{done.undo}</AlertDialog.Action>
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </AlertDialog>
        </ImportPage>
    );
}
