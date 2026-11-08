import { RiDraggable } from "@remixicon/react";
import { Button } from "panelui-web/button";
import { Fragment, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { LookTile } from "@/components/ledger/tiles";

import type { Category, CategoryNode } from "./model";
import { useCategoryWrites } from "./write";

export const moved = <Item,>(items: readonly Item[], from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    if (item !== undefined) {
        next.splice(to, 0, item);
    }
    return next;
};

function ReorderRow({
    depth,
    dragging,
    onDragStart,
    onKeyMove,
    row,
    scope,
}: {
    depth: 0 | 1;
    dragging: boolean;
    onDragStart: (event: PointerEvent<HTMLButtonElement>) => void;
    onKeyMove: (delta: number) => void;
    row: Category;
    scope: string;
}) {
    const copy = useIntlayer("dashboard-categories");
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            onKeyMove(event.key === "ArrowUp" ? -1 : 1);
        }
    };
    return (
        <div
            className={`border-border flex h-11 items-center gap-2.5 border-t px-3 first:border-t-0 ${depth ? "pl-9" : ""} ${dragging ? "bg-muted" : ""}`}
            data-reorder-id={row.localId}
            data-reorder-scope={scope}
        >
            <Button
                aria-label={copy.move({ name: row.name ?? "" }).value}
                className="text-muted-foreground cursor-grab touch-none active:cursor-grabbing"
                onKeyDown={onKeyDown}
                onPointerDown={onDragStart}
                size="icon-sm"
                variant="ghost"
            >
                <RiDraggable size={16} />
            </Button>
            <LookTile look={row} />
            <span className="min-w-0 truncate text-[13px] font-medium">{row.name}</span>
        </div>
    );
}

export function ReorderList({ tree }: { tree: readonly CategoryNode[] }) {
    const writes = useCategoryWrites();
    const [drag, setDrag] = useState<{ id: string; order: readonly string[]; scope: string } | null>(null);

    const orderFor = (scope: string) =>
        scope === "top"
            ? tree.map((node) => node.localId)
            : (tree.find((node) => node.localId === scope)?.children.map((child) => child.localId) ?? []);
    const shown = (scope: string, ids: readonly string[]) => (drag?.scope === scope ? drag.order : ids);

    const start = (event: PointerEvent<HTMLButtonElement>, id: string, scope: string) => {
        const handle = event.currentTarget;
        handle.setPointerCapture(event.pointerId);
        let order = orderFor(scope);
        setDrag({ id, order, scope });
        const onMove = (move: globalThis.PointerEvent) => {
            const over = document
                .elementFromPoint(move.clientX, move.clientY)
                ?.closest<HTMLElement>(`[data-reorder-scope="${scope}"]`);
            const target = over?.dataset.reorderId;
            if (!target || target === id) {
                return;
            }
            order = moved(order, order.indexOf(id), order.indexOf(target));
            setDrag({ id, order, scope });
        };
        const stop = () => {
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            handle.removeEventListener("pointercancel", stop);
            setDrag(null);
        };
        function onUp() {
            stop();
            writes.reorder(order);
        }
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", stop);
    };

    const keyMove = (id: string, scope: string, delta: number) => {
        const order = orderFor(scope);
        const from = order.indexOf(id);
        const to = from + delta;
        if (to >= 0 && to < order.length) {
            writes.reorder(moved(order, from, to));
        }
    };

    const byId = new Map(tree.flatMap((node) => [node, ...node.children]).map((row) => [row.localId, row]));
    const rowsOf = (scope: string, ids: readonly string[]) =>
        shown(scope, ids).flatMap((id) => {
            const row = byId.get(id);
            return row ? [row] : [];
        });
    return (
        <div>
            {rowsOf(
                "top",
                tree.map((node) => node.localId)
            ).map((row) => (
                <Fragment key={row.localId}>
                    <ReorderRow
                        depth={0}
                        dragging={drag?.id === row.localId}
                        onDragStart={(event) => start(event, row.localId, "top")}
                        onKeyMove={(delta) => keyMove(row.localId, "top", delta)}
                        row={row}
                        scope="top"
                    />
                    {rowsOf(row.localId, orderFor(row.localId)).map((child) => (
                        <ReorderRow
                            depth={1}
                            dragging={drag?.id === child.localId}
                            key={child.localId}
                            onDragStart={(event) => start(event, child.localId, row.localId)}
                            onKeyMove={(delta) => keyMove(child.localId, row.localId, delta)}
                            row={child}
                            scope={row.localId}
                        />
                    ))}
                </Fragment>
            ))}
        </div>
    );
}
