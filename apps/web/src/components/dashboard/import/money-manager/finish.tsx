import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import CheckmarkCircle02Icon from "@hugeicons/core-free-icons/CheckmarkCircle02Icon";
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
import { MmBar, NavRow } from "./parts";

const CENT = 0.005;

export function Importing({ draft }: { draft: Draft }) {
    const { bar, importing } = useIntlayer("dashboard-import-mm");
    const plan = planOf(draft);
    return (
        <ImportPage>
            <MmBar title={importing.title} />
            <Columns
                rail={
                    <Card title={importing.steps}>
                        <NavRow detail={plan.accounts.length} title={importing.accounts} />
                        <NavRow detail={plan.categories.length} title={importing.categories} />
                        {plan.budgets.length > 0 ? (
                            <NavRow detail={plan.budgets.length} title={importing.budgets} />
                        ) : null}
                        <NavRow detail={planSize(plan)} title={importing.entries} />
                    </Card>
                }
            >
                <Card title={bar.title}>
                    <p className="px-4 py-3 text-sm">{fill(importing.body.value, { n: planSize(plan) })}</p>
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
    const day = date.full(new Date(at).toISOString().slice(0, 10));
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
                    <Button render={<Link to="/app/transactions" />} size="sm">
                        {done.openTransactions}
                    </Button>
                </MmBar>
            </ImportPage>
        );
    }
    return (
        <ImportPage>
            <MmBar title={bar.title}>
                <Button render={<Link to="/app/transactions" />} size="sm">
                    {done.openTransactions}
                </Button>
            </MmBar>
            <Columns
                rail={
                    <Card title={done.undoTitle}>
                        <p className="text-muted-foreground px-4 py-3 text-[13px] leading-5">
                            {fill(done.undoBody.value, { day, n: entryCount })}
                        </p>
                        <div className="px-4 pb-4">
                            <Button onClick={() => setAsking(true)} size="sm" variant="outline">
                                {done.undo}
                            </Button>
                        </div>
                    </Card>
                }
            >
                {failed ? <Banner title={done.undoFailed} tone="bad" /> : null}
                <Card title={done.inOutlayr}>
                    <NavRow detail={imported.accountIds.length} title={done.accounts} />
                    <NavRow detail={imported.categoryIds.length} title={done.categories} />
                    {imported.budgetIds.length > 0 ? (
                        <NavRow detail={imported.budgetIds.length} title={done.budgets} />
                    ) : null}
                    <NavRow detail={entryCount} title={done.entries} />
                </Card>
                {checks.length > 0 ? (
                    <Card
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
                        {fill(done.undoBody.value, { day, n: entryCount })}
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
