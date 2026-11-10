import AlertCircleIcon from "@hugeicons/core-free-icons/AlertCircleIcon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import Copy01Icon from "@hugeicons/core-free-icons/Copy01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PauseIcon from "@hugeicons/core-free-icons/PauseIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import PlayIcon from "@hugeicons/core-free-icons/PlayIcon";
import TestTubeIcon from "@hugeicons/core-free-icons/TestTubeIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Switch } from "panelui-web/switch";
import { Table } from "panelui-web/table";
import { useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useIntlayer } from "react-intlayer";

import { categoryOf, tagsOf } from "@/lib/rules";
import type { Rule } from "@/lib/rules";

import type { RulesData } from "./data";
import { CELL, CategoryBadge, ConditionChip, FIGURE, HEAD, LIT, NAME, TagMarks, useShortDay } from "./parts";

export interface RuleActions {
    onDelete: (rule: Rule) => void;
    onDuplicate: (rule: Rule) => void;
    onEdit: (rule: Rule) => void;
    onMove: (rule: Rule, position: number) => void;
    onRun: (rule: Rule) => void;
    onTest: (rule: Rule) => void;
    onToggle: (rule: Rule, on: boolean) => void;
}

export interface Moving {
    name: string;
    position: number;
}

const ABOVE = "[&>td]:shadow-[inset_0_2px_0_var(--color-app-tint)]";
const BELOW = "[&>td]:shadow-[inset_0_-2px_0_var(--color-app-tint)]";
const OVER = "relative z-[1]";

function RowMenu({
    actions,
    onOpenChange,
    rule,
}: {
    actions: RuleActions;
    onOpenChange: (open: boolean) => void;
    rule: Rule;
}) {
    const { menu, runPast } = useIntlayer("dashboard-rules");
    return (
        <Menu onOpenChange={onOpenChange}>
            <Menu.Trigger
                aria-label={menu.more({ name: rule.name }).value}
                render={<Button className={`text-muted-foreground ${OVER}`} size="icon-sm" variant="ghost" />}
            >
                <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-60" sideOffset={6}>
                <Menu.Item onClick={() => actions.onEdit(rule)}>
                    <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                    {menu.edit}
                </Menu.Item>
                <Menu.Item onClick={() => actions.onTest(rule)}>
                    <HugeiconsIcon icon={TestTubeIcon} size={16} />
                    {menu.test}
                </Menu.Item>
                <Menu.Item onClick={() => actions.onRun(rule)}>
                    <HugeiconsIcon icon={PlayIcon} size={16} />
                    {runPast}
                </Menu.Item>
                <Menu.Item onClick={() => actions.onDuplicate(rule)}>
                    <HugeiconsIcon icon={Copy01Icon} size={16} />
                    {menu.duplicate}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => actions.onMove(rule, 0)}>
                    <HugeiconsIcon icon={ArrowUp02Icon} size={16} />
                    {menu.top}
                </Menu.Item>
                <Menu.Item onClick={() => actions.onToggle(rule, !rule.on)}>
                    <HugeiconsIcon icon={rule.on ? PauseIcon : PlayIcon} size={16} />
                    {rule.on ? menu.disable : menu.enable}
                </Menu.Item>
                <Menu.Separator />
                <Menu.Item onClick={() => actions.onDelete(rule)} variant="destructive">
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                    {menu.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

interface Drag {
    gap: number;
    id: string;
}

const slotOf = (from: number, gap: number) => (gap > from ? gap - 1 : gap);

export function RuleList({
    actions,
    data,
    editing,
    onMoving,
}: {
    actions: RuleActions;
    data: RulesData;
    editing: string | null;
    onMoving: (moving: Moving | null) => void;
}) {
    const { columns, menu } = useIntlayer("dashboard-rules");
    const shortDay = useShortDay();
    const [drag, setDrag] = useState<Drag | null>(null);
    const [menuFor, setMenuFor] = useState<string | null>(null);
    const { rules } = data.book;
    const conflicted = new Set(data.conflicts.map((conflict) => conflict.first.id));
    const lastDay = new Map(data.entries.map((entry) => [entry.at, entry.day]));

    const start = (event: PointerEvent<HTMLButtonElement>, rule: Rule) => {
        if (event.button !== 0) {
            return;
        }
        const handle = event.currentTarget;
        const from = rules.findIndex((row) => row.id === rule.id);
        let gap = from;
        handle.setPointerCapture(event.pointerId);
        setDrag({ gap, id: rule.id });
        onMoving({ name: rule.name, position: from + 1 });
        const onMove = (move: globalThis.PointerEvent) => {
            const row = document.elementFromPoint(move.clientX, move.clientY)?.closest<HTMLElement>("[data-rule-id]");
            const over = rules.findIndex((each) => each.id === row?.dataset.ruleId);
            if (!row || over === -1) {
                return;
            }
            const box = row.getBoundingClientRect();
            const next = move.clientY < box.top + box.height / 2 ? over : over + 1;
            if (next !== gap) {
                gap = next;
                setDrag({ gap, id: rule.id });
                onMoving({ name: rule.name, position: slotOf(from, gap) + 1 });
            }
        };
        const stop = () => {
            handle.removeEventListener("pointermove", onMove);
            handle.removeEventListener("pointerup", onUp);
            handle.removeEventListener("pointercancel", stop);
            globalThis.removeEventListener("keydown", onKey, true);
            setDrag(null);
            onMoving(null);
        };
        function onUp() {
            stop();
            const to = slotOf(from, gap);
            if (to !== from) {
                actions.onMove(rule, to);
            }
        }
        function onKey(key: globalThis.KeyboardEvent) {
            if (key.key === "Escape") {
                key.preventDefault();
                key.stopPropagation();
                stop();
            }
        }
        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", stop);
        globalThis.addEventListener("keydown", onKey, true);
    };

    const keyMove = (event: KeyboardEvent, rule: Rule, index: number) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
            return;
        }
        event.preventDefault();
        const to = index + (event.key === "ArrowUp" ? -1 : 1);
        if (to >= 0 && to < rules.length) {
            actions.onMove(rule, to);
        }
    };

    const from = drag ? rules.findIndex((rule) => rule.id === drag.id) : -1;
    const moves = drag !== null && slotOf(from, drag.gap) !== from;
    const lineOf = (index: number) => {
        if (!drag || !moves) {
            return "";
        }
        if (drag.gap === index) {
            return ABOVE;
        }
        return drag.gap === rules.length && index === rules.length - 1 ? BELOW : "";
    };

    return (
        <Table className="w-full" containerClassName="overflow-x-auto">
            <Table.Header className="in-data-[sticky]:bg-card">
                <Table.Row className="border-0 hover:bg-transparent">
                    <Table.Head className={`${HEAD} w-[5.5%]`}>{columns.order}</Table.Head>
                    <Table.Head className={`${HEAD} w-[14%]`}>{columns.rule}</Table.Head>
                    <Table.Head className={`${HEAD} w-[38.5%]`}>{columns.when}</Table.Head>
                    <Table.Head className={HEAD}>{columns.outcome}</Table.Head>
                    <Table.Head align="end" className={HEAD}>
                        {columns.matches}
                    </Table.Head>
                    <Table.Head className={HEAD}>{columns.lastMatch}</Table.Head>
                    <Table.Head className={`${HEAD} w-11`}>{columns.on}</Table.Head>
                    <Table.Head className={`${HEAD} w-10`} />
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {rules.map((rule, index) => {
                    const stat = data.stats.byRule.get(rule.id);
                    const categoryId = categoryOf(rule);
                    const lifted = drag?.id === rule.id;
                    const lit = editing === rule.id || menuFor === rule.id;
                    const dim = rule.on ? "" : "opacity-45";
                    const day = stat?.lastAt ? lastDay.get(stat.lastAt) : undefined;
                    return (
                        <Table.Row
                            className={`relative ${lit ? LIT : "hover:bg-muted/40"} ${lifted ? "bg-app-fill hover:bg-app-fill" : ""} ${lineOf(index)}`}
                            data-rule-id={rule.id}
                            key={rule.id}
                        >
                            <Table.Cell className={CELL}>
                                <div className={`flex items-center gap-1 ${dim}`}>
                                    <Button
                                        aria-label={menu.move({ name: rule.name }).value}
                                        className={`-mx-1.5 cursor-grab touch-none active:cursor-grabbing ${OVER} ${lifted ? "text-app-tint" : "text-muted-foreground"}`}
                                        onKeyDown={(event) => keyMove(event, rule, index)}
                                        onPointerDown={(event) => start(event, rule)}
                                        size="icon-sm"
                                        variant="ghost"
                                    >
                                        <HugeiconsIcon icon={DragDropVerticalIcon} size={16} />
                                    </Button>
                                    <span className={`${FIGURE} text-muted-foreground text-sm`}>{index + 1}</span>
                                </div>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <span className={`inline-flex items-center gap-1.5 ${dim}`}>
                                    <button
                                        className={`${NAME} cursor-pointer text-left outline-none after:absolute after:inset-0 focus-visible:underline`}
                                        onClick={() => actions.onEdit(rule)}
                                        type="button"
                                    >
                                        {rule.name}
                                    </button>
                                    {conflicted.has(rule.id) ? (
                                        <HugeiconsIcon
                                            className="text-app-warn flex-none"
                                            icon={AlertCircleIcon}
                                            size={14}
                                        />
                                    ) : null}
                                </span>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className={`flex gap-1 ${dim}`}>
                                    {rule.conditions.map((condition) => (
                                        <ConditionChip
                                            condition={condition}
                                            key={`${condition.field}:${condition.op}:${condition.value}`}
                                        />
                                    ))}
                                </div>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <div className={`flex items-center gap-1.5 ${dim}`}>
                                    {categoryId === null ? null : <CategoryBadge id={categoryId} />}
                                    <TagMarks ids={tagsOf(rule)} names={data.tagNames} />
                                </div>
                            </Table.Cell>
                            <Table.Cell align="end" className={`${CELL} ${FIGURE} text-sm`}>
                                <span className={dim}>{stat?.count ?? 0}</span>
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground text-sm`}>
                                <span className={dim}>{day ? shortDay(day) : ""}</span>
                            </Table.Cell>
                            <Table.Cell className={CELL}>
                                <Switch
                                    aria-label={menu.toggle({ name: rule.name }).value}
                                    checked={rule.on}
                                    className={`${OVER} ${dim}`}
                                    onCheckedChange={(on) => actions.onToggle(rule, on)}
                                />
                            </Table.Cell>
                            <Table.Cell className={`${CELL} ps-0!`}>
                                <RowMenu
                                    actions={actions}
                                    onOpenChange={(open) =>
                                        setMenuFor((current) => {
                                            if (open) {
                                                return rule.id;
                                            }
                                            return current === rule.id ? null : current;
                                        })
                                    }
                                    rule={rule}
                                />
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table>
    );
}
