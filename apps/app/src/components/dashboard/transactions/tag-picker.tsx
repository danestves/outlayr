import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Chip } from "panelui-web/chip";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { useMemo, useRef, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { MenuContent } from "@/components/ui/menu-content";
import type { CommitRow, LedgerCommit } from "@/lib/ledger-committer";
import type { Tag } from "@/lib/ledger-db";
import { useLedgerBooks, useTagBooks } from "@/lib/ledger-db";
import {
    createdTag,
    entryTags,
    findTag,
    liveTags,
    newLink,
    normalizeTagName,
    TAG_NAME_LIMIT,
    tagUseCounts,
    toggledTag,
} from "@/lib/rule-writes";

import { entryNotices } from "./use-delete";

const ADD =
    "rounded-app-sm text-muted-foreground hover:bg-app-hover focus-visible:ring-ring/30 inline-flex size-6 shrink-0 items-center justify-center outline-none focus-visible:ring-3";
const COUNT = "text-muted-foreground text-app-label ms-auto ps-3 font-mono tabular-nums";
const ACTIVE = "bg-accent";
const IME_KEY_CODE = 229;

const holds = new Set<{ commit: LedgerCommit; keys: ReadonlySet<string> }>();

interface TagPickerProps {
    defaultOpen?: boolean;
    editable: boolean;
    entryId: string;
    onDismiss?: () => void;
    onEscape?: () => void;
    triggerLabel?: string;
}

/** An entry's tags, written through one undoable commit per toggle. */
export function TagPicker({
    defaultOpen = false,
    editable,
    entryId,
    onDismiss,
    onEscape,
    triggerLabel,
}: TagPickerProps) {
    const committer = useLedgerCommitter(entryNotices);
    const books = useLedgerBooks();
    const tagBooks = useTagBooks();
    const { form } = useIntlayer("dashboard-transactions");
    const { bulk, inline } = useIntlayer("dashboard-ledger");
    const [needle, setNeedle] = useState("");
    const [cursor, setCursor] = useState(0);
    const list = useRef<HTMLDivElement>(null);
    const wrapper = useRef<HTMLDivElement>(null);
    const tags = useMemo(() => liveTags(tagBooks), [tagBooks]);
    const selected = useMemo(() => entryTags(tagBooks, entryId), [entryId, tagBooks]);
    const counts = useMemo(() => tagUseCounts(tagBooks, books.transactions), [books.transactions, tagBooks]);
    const selectedIds = new Set(selected.map((tag) => tag.localId));
    const typed = needle.replace(/^#+/u, "").trim().replaceAll(/\s+/gu, " ");
    const tooLong = typed.length > TAG_NAME_LIMIT;
    const name = normalizeTagName(typed);
    const needleKey = name.toLocaleLowerCase();
    const shown = tags.filter((tag) => tag.name.toLocaleLowerCase().includes(needleKey));
    const fresh = name !== "" && !tooLong && findTag(tags, name) === undefined;
    const last = shown.length + (fresh ? 1 : 0) - 1;
    const active = Math.min(cursor, Math.max(last, 0));
    const save = (rows: readonly CommitRow[]) => {
        setNeedle("");
        if (needle !== "") {
            setCursor(0);
        }
        if (rows.length === 0) {
            return;
        }
        const keys = new Set(rows.map((row) => `${row.table}:${row.localId}`));
        for (const each of holds) {
            if (rows.some((row) => each.keys.has(`${row.table}:${row.localId}`))) {
                void each.commit.flush();
                holds.delete(each);
            }
        }
        const hold = {
            commit: committer.commitWithUndo(rows, {
                failed: form.saveFailed.value,
                text: inline.tagsSaved.value,
            }),
            keys,
        };
        holds.add(hold);
        void hold.commit.settled.then(() => holds.delete(hold));
    };
    const toggle = (tag: Tag) => save(toggledTag(tagBooks, entryId, tag.localId, Date.now()));
    const create = () => {
        const known = findTag(liveTags(tagBooks), name);
        if (known) {
            save(toggledTag(tagBooks, entryId, known.localId, Date.now()));
            return;
        }
        const at = Date.now();
        const id = crypto.randomUUID();
        save([createdTag(id, name, at), newLink(entryId, id, at)]);
    };
    const pick = () => {
        if (tooLong) {
            return;
        }
        const tag = shown[active];
        if (tag) {
            toggle(tag);
            return;
        }
        if (fresh) {
            create();
        }
    };
    return (
        <div className="relative z-1 flex min-w-0 flex-wrap items-center gap-1.5" ref={wrapper}>
            {selected.map((tag) =>
                editable ? (
                    <Chip
                        key={tag.localId}
                        onRemove={() => {
                            const buttons = [...(wrapper.current?.querySelectorAll("button") ?? [])];
                            const focused = document.activeElement;
                            const at = focused instanceof HTMLButtonElement ? buttons.indexOf(focused) : -1;
                            toggle(tag);
                            if (at !== -1) {
                                buttons[at + 1]?.focus();
                            }
                        }}
                        removeLabel={inline.removeTag({ name: tag.name }).value}
                        size="sm"
                    >
                        #{tag.name}
                    </Chip>
                ) : (
                    <span className="text-muted-foreground" key={tag.localId}>
                        #{tag.name}
                    </span>
                )
            )}
            {editable ? (
                <Menu
                    defaultOpen={defaultOpen}
                    modal={false}
                    onOpenChange={(open, details) => {
                        if (open) {
                            return;
                        }
                        if (details.reason === "escape-key") {
                            if (onEscape) {
                                onEscape();
                            } else {
                                onDismiss?.();
                            }
                            return;
                        }
                        if (details.reason === "outside-press" || details.reason === "focus-out") {
                            const { event } = details;
                            const target =
                                details.reason === "focus-out" && event instanceof FocusEvent
                                    ? event.relatedTarget
                                    : event.target;
                            if (target instanceof Node && wrapper.current?.contains(target)) {
                                details.cancel();
                                return;
                            }
                        }
                        onDismiss?.();
                    }}
                >
                    <Menu.Trigger aria-label={triggerLabel ?? bulk.addTag.value} className={ADD}>
                        <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
                    </Menu.Trigger>
                    <MenuContent align="start" className="w-64 p-2" side="bottom" sideOffset={4}>
                        <Input.Group size="sm">
                            <Input.Addon>
                                <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} />
                            </Input.Addon>
                            <Input
                                aria-label={bulk.searchTags.value}
                                autoFocus
                                onChange={(event) => {
                                    setNeedle(event.target.value);
                                    setCursor(0);
                                }}
                                onKeyDown={(event) => {
                                    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === IME_KEY_CODE) {
                                        return;
                                    }
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        pick();
                                    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        if (last >= 0) {
                                            const next = Math.min(
                                                Math.max(active + (event.key === "ArrowDown" ? 1 : -1), 0),
                                                last
                                            );
                                            setCursor(next);
                                            list.current
                                                ?.querySelector(`[data-tag-index="${next}"]`)
                                                ?.scrollIntoView({ block: "nearest" });
                                        }
                                    } else if (event.key !== "Escape") {
                                        event.stopPropagation();
                                    }
                                }}
                                placeholder={bulk.searchTags.value}
                                value={needle}
                            />
                        </Input.Group>
                        {tooLong ? (
                            <p className="text-destructive text-app-label px-1 pt-1.5">
                                {inline.tagTooLong({ limit: String(TAG_NAME_LIMIT) })}
                            </p>
                        ) : null}
                        <div className="mt-1 max-h-60 overflow-y-auto" ref={list}>
                            {shown.map((tag, index) => (
                                <Menu.CheckboxItem
                                    checked={selectedIds.has(tag.localId)}
                                    className={index === active ? ACTIVE : undefined}
                                    closeOnClick={false}
                                    data-tag-index={index}
                                    key={tag.localId}
                                    onCheckedChange={() => toggle(tag)}
                                    onFocus={() => setCursor(index)}
                                    onMouseEnter={() => setCursor(index)}
                                >
                                    <span className="text-muted-foreground font-mono">#</span>
                                    <span className="truncate">{tag.name}</span>
                                    <span className={COUNT}>{counts.get(tag.localId) ?? 0}</span>
                                </Menu.CheckboxItem>
                            ))}
                            {fresh ? (
                                <Menu.Item
                                    className={shown.length === active ? ACTIVE : undefined}
                                    closeOnClick={false}
                                    data-tag-index={shown.length}
                                    onClick={create}
                                    onFocus={() => setCursor(shown.length)}
                                    onMouseEnter={() => setCursor(shown.length)}
                                >
                                    {inline.createNamed({ name })}
                                </Menu.Item>
                            ) : null}
                            {shown.length === 0 && !fresh && !tooLong ? (
                                <p className="text-muted-foreground text-app-label px-1 py-2">{inline.noTagsFound}</p>
                            ) : null}
                        </div>
                    </MenuContent>
                </Menu>
            ) : null}
        </div>
    );
}
