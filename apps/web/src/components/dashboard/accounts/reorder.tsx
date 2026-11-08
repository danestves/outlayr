import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { useMemo, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { reorderedAccounts } from "@/lib/account-writes";
import { openAccounts } from "@/lib/dashboard-series-ledger";
import { commitRows } from "@/lib/ledger-commit";
import { useDisplayFormat, writeSettings } from "@/lib/ledger-settings";

import { AccountsBar, Card } from "./accounts-screen";
import { useLedgerDb } from "./flows";
import { Glyph } from "./glyph";
import { accountRows, groupRows, sortRows, storedSort } from "./model";
import type { AccountRow, AccountSort } from "./model";
import { Segments } from "./parts";

const moved = (ids: readonly string[], id: string, to: number) => {
    const rest = ids.filter((each) => each !== id);
    return [...rest.slice(0, to), id, ...rest.slice(to)];
};

function Rows({ onMove, rows }: { onMove: (id: string, to: number) => void; rows: readonly AccountRow[] }) {
    const { flows } = useIntlayer("dashboard-accounts");
    const { photos } = useDashboard();
    const { money } = useDisplayFormat();
    const list = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState<string | null>(null);

    const onDrag = (event: PointerEvent, id: string) => {
        if (dragging !== id) {
            return;
        }
        const slots = [...(list.current?.children ?? [])];
        const to = slots.filter((slot) => {
            const { bottom, top } = slot.getBoundingClientRect();
            return (top + bottom) / 2 < event.clientY;
        }).length;
        const from = rows.findIndex((row) => row.id === id);
        // The dragged row counts as a slot above the pointer once it has moved past its own middle.
        const next = to > from ? to - 1 : to;
        if (next !== from) {
            onMove(id, next);
        }
    };
    const onKey = (event: KeyboardEvent, id: string, index: number) => {
        const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
        if (step === undefined) {
            return;
        }
        event.preventDefault();
        const to = index + step;
        if (to >= 0 && to < rows.length) {
            const handle = event.currentTarget;
            onMove(id, to);
            // React moves the row's node to reorder it, and the browser drops focus from a moved node.
            requestAnimationFrame(() => handle instanceof HTMLElement && handle.focus());
        }
    };

    return (
        <div ref={list}>
            {rows.map((row, index) => {
                const lifted = dragging === row.id;
                return (
                    <div
                        className={`flex h-14 items-center gap-3 border-b pr-5 pl-5 last:border-0 ${lifted ? "border-border bg-app-hover relative z-10 -mx-1.5 rounded-xl border px-[26px] shadow-lg" : ""}`}
                        key={row.id}
                    >
                        <button
                            aria-label={flows.reorderMove({ name: row.name }).value}
                            className={`-ml-1 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded ${lifted ? "text-app-tint" : "text-muted-foreground"}`}
                            onKeyDown={(event) => onKey(event, row.id, index)}
                            onPointerCancel={() => setDragging(null)}
                            onPointerDown={(event) => {
                                event.currentTarget.setPointerCapture(event.pointerId);
                                setDragging(row.id);
                            }}
                            onPointerMove={(event) => onDrag(event, row.id)}
                            onPointerUp={() => setDragging(null)}
                            type="button"
                        >
                            <Glyph icon={DragDropVerticalIcon} size={17} />
                        </button>
                        <span className="dash-figure text-muted-foreground w-4 shrink-0 text-center text-xs">
                            {index + 1}
                        </span>
                        <AccountTile account={row.look} photos={photos} size="lg" />
                        <div className="min-w-0 flex-1">
                            <b className="block truncate text-sm leading-[18px] font-medium">{row.name}</b>
                            <small className="text-muted-foreground block truncate text-xs leading-4">
                                {row.currency}
                            </small>
                        </div>
                        <span className="dash-figure text-sm font-medium whitespace-nowrap">
                            {money(row.balance, row.currency)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function Group({
    aside,
    onMove,
    rows,
    title,
}: {
    aside?: ReactNode;
    onMove: (id: string, to: number) => void;
    rows: readonly AccountRow[];
    title: ReactNode;
}) {
    if (rows.length === 0) {
        return null;
    }
    return (
        <Card aside={aside} count={rows.length} panelClassName="overflow-visible" title={title}>
            <Rows onMove={onMove} rows={rows} />
        </Card>
    );
}

/** Drafts the order here and writes only on Done; Cancel leaves the ledger untouched. */
export function ReorderAccounts() {
    const { ledger, overview } = useDashboard();
    const { actions, detail, flows, list } = useIntlayer("dashboard-accounts");
    const db = useLedgerDb();
    const navigate = useNavigate();
    const all = useMemo(() => accountRows(ledger, overview), [ledger, overview]);
    // Both stay unset until the first change: a reload paints the local copy, and sync may still move rows under it.
    const [pickedSort, setSort] = useState<AccountSort | null>(null);
    const [movedIds, setDraft] = useState<readonly string[] | null>(null);
    const sort = pickedSort ?? storedSort(ledger);
    const draft = movedIds ?? all.map((row) => row.id);
    const [failed, setFailed] = useState(false);

    const byId = new Map(all.map((row) => [row.id, row]));
    const ordered = draft.flatMap((id) => byId.get(id) ?? []);
    const { assets, cards } = groupRows(sortRows(ordered, sort));

    const moveIn = (group: readonly AccountRow[]) => (id: string, to: number) => {
        const ids = moved(
            group.map((row) => row.id),
            id,
            to
        );
        const inGroup = new Set(ids);
        setSort("order");
        setDraft([
            ...ids,
            ...sortRows(ordered, sort)
                .map((row) => row.id)
                .filter((each) => !inGroup.has(each)),
        ]);
    };

    const done = async () => {
        setFailed(false);
        const openOnes = openAccounts(ledger.books);
        const open = new Map(openOnes.map((row) => [row.localId, row]));
        const shelved = ledger.books.accounts.filter((row) => row.deletedAt === null && !open.has(row.localId));
        const inGroups = groupRows(ordered);
        const chosen = [...inGroups.assets, ...inGroups.cards].flatMap((row) => open.get(row.id) ?? []);
        const seen = new Set(chosen.map((row) => row.localId));
        const order = [...chosen, ...openOnes.filter((row) => !seen.has(row.localId)), ...shelved];
        try {
            if (sort === "order") {
                // oxlint-disable-next-line react/purity -- runs on a click, not during render.
                await commitRows(db, reorderedAccounts(order, Date.now()));
            }
            await writeSettings(db, { accountsByHand: String(sort === "order") });
            await navigate({ to: "/app/accounts" });
        } catch {
            setFailed(true);
        }
    };

    const hint = <span className="font-sans">{flows.reorderHint}</span>;
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar
                title={
                    <span className="flex min-w-0 items-center gap-3">
                        <Link
                            aria-label={detail.back.value}
                            className="border-border bg-app-hover inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
                            to="/app/accounts"
                        >
                            <Glyph icon={ArrowLeft02Icon} className="text-muted-foreground" size={17} />
                        </Link>
                        <span className="truncate">{actions.reorder}</span>
                    </span>
                }
            >
                {failed ? <span className="text-app-spend text-[13px]">{flows.reorderFailed}</span> : null}
                <Segments
                    onPick={setSort}
                    options={[
                        { label: actions.yourOrder, value: "order" },
                        { label: actions.byBalance, value: "balance" },
                    ]}
                    value={sort}
                />
                <Button nativeButton={false} render={<Link to="/app/accounts" />} variant="outline">
                    {flows.cancel}
                </Button>
                <Button onClick={done}>{flows.reorderDone}</Button>
            </AccountsBar>
            <div className="mx-auto flex max-w-[760px] flex-col gap-4">
                <Group aside={hint} onMove={moveIn(assets)} rows={assets} title={list.accounts} />
                <Group
                    aside={assets.length === 0 ? hint : undefined}
                    onMove={moveIn(cards)}
                    rows={cards}
                    title={list.cards}
                />
            </div>
        </main>
    );
}
