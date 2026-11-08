import { firstAvailableColor, CATEGORY_PALETTE } from "@outlayr/money/category-rules";
import { RiAddLine, RiSearchLine } from "@remixicon/react";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Segments } from "@/components/dashboard/accounts/parts";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { LookTile } from "@/components/ledger/tiles";

import { categoryProblem, categoryTree, INCOME_COLOR, liveCategories, MAX_EXPENSE_CATEGORIES } from "./model";
import type { Category } from "./model";
import { useCategoryWrites } from "./write";

const ICON_KEYS = [...CATEGORY_ICONS.keys()];
const EMOJI = [
    "🍎",
    "🍞",
    "🥐",
    "🍔",
    "🍕",
    "🌮",
    "🍣",
    "🥗",
    "🍜",
    "🍦",
    "🍰",
    "☕️",
    "🍺",
    "🍷",
    "🥤",
    "🛒",
    "🛍️",
    "👕",
    "👗",
    "👟",
    "👜",
    "💄",
    "💍",
    "🎁",
    "📦",
    "🧾",
    "🚗",
    "🚕",
    "🚌",
    "🚆",
    "🚲",
    "🛵",
    "✈️",
    "⛽️",
    "🅿️",
    "🚢",
    "🧳",
    "🗺️",
    "🏖️",
    "🏝️",
    "🎒",
    "🏠",
    "🏡",
    "🔑",
    "🛋️",
    "🛏️",
    "🚿",
    "🧹",
    "🧺",
    "💡",
    "🔌",
    "🔥",
    "💧",
    "📶",
    "🛠️",
    "🪴",
    "💊",
    "🩺",
    "🏥",
    "🦷",
    "👓",
    "🧘",
    "🏋️",
    "🏃",
    "⚽️",
    "🚴",
    "🧴",
    "💇",
    "🎬",
    "🎮",
    "🎧",
    "🎵",
    "📚",
    "🎨",
    "🎤",
    "🎭",
    "📺",
    "🎲",
    "🎪",
    "📸",
    "💰",
    "💵",
    "💳",
    "🏦",
    "📈",
    "📉",
    "💼",
    "🧑‍💻",
    "🏢",
    "🧮",
    "🪙",
    "🤝",
    "📊",
    "🎓",
    "✏️",
    "🏫",
    "🐶",
    "🐱",
    "🐾",
    "👶",
    "👨‍👩‍👧",
    "❤️",
    "🎉",
    "🎂",
    "⭐️",
    "🌍",
    "☂️",
    "🔔",
    "📱",
    "💻",
    "✉️",
    "❓",
];
const NO_PARENT = "none";

export type EditorTarget = { doc: Category } | { income: boolean; parentId: string | null };

interface CategorySymbol {
    emoji: string | null;
    icon: string | null;
}

function SymbolDialog({
    color,
    onClose,
    onPick,
    value,
}: {
    color: string;
    onClose: () => void;
    onPick: (symbol: CategorySymbol) => void;
    value: CategorySymbol;
}) {
    const copy = useIntlayer("dashboard-categories");
    const [tab, setTab] = useState<"emoji" | "icons">(value.emoji ? "emoji" : "icons");
    const [query, setQuery] = useState("");
    const needle = query.trim().toLowerCase();
    const keys = needle ? ICON_KEYS.filter((key) => key.toLowerCase().includes(needle)) : ICON_KEYS;
    const pick = (symbol: CategorySymbol) => {
        onPick(symbol);
        onClose();
    };
    const CELL =
        "hover:bg-muted flex size-10 items-center justify-center rounded-[10px] data-[on=true]:ring-2 data-[on=true]:ring-(--color-primary)";
    return (
        <Dialog onOpenChange={(open) => open || onClose()} open>
            <Dialog.Content className="app-shell sm:max-w-[560px]">
                <Dialog.Header>
                    <Dialog.Title>{copy.symbol}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 max-sm:flex-wrap">
                        {tab === "icons" ? (
                            <div className="relative min-w-0 flex-1">
                                <RiSearchLine
                                    className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                                    size={15}
                                />
                                <Input
                                    aria-label={copy.searchSymbols.value}
                                    className="pl-9 max-sm:text-base"
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={copy.searchSymbols.value}
                                    value={query}
                                />
                            </div>
                        ) : (
                            <span className="flex-1" />
                        )}
                        <Segments
                            onPick={setTab}
                            options={[
                                { label: copy.icons, value: "icons" },
                                { label: copy.emoji, value: "emoji" },
                            ]}
                            value={tab}
                        />
                    </div>
                    <div className="grid max-h-[300px] grid-cols-[repeat(auto-fill,minmax(40px,1fr))] justify-items-center gap-1 overflow-y-auto">
                        {tab === "icons"
                            ? keys.map((key) => (
                                  <button
                                      aria-label={key}
                                      className={CELL}
                                      data-on={value.icon === key}
                                      key={key}
                                      onClick={() => pick({ emoji: null, icon: key })}
                                      type="button"
                                  >
                                      <LookTile look={{ color, emoji: null, icon: key }} />
                                  </button>
                              ))
                            : EMOJI.map((emoji) => (
                                  <button
                                      className={`${CELL} text-xl`}
                                      data-on={value.emoji === emoji}
                                      key={emoji}
                                      onClick={() => pick({ emoji, icon: null })}
                                      type="button"
                                  >
                                      {emoji}
                                  </button>
                              ))}
                    </div>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={() => pick({ emoji: null, icon: null })} type="button" variant="outline">
                        {copy.remove}
                    </Button>
                    <Button onClick={onClose} type="button">
                        {copy.done}
                    </Button>
                </Dialog.Footer>
            </Dialog.Content>
        </Dialog>
    );
}

function SymbolButton({ color, onClick, symbol }: { color: string; onClick: () => void; symbol: CategorySymbol }) {
    const copy = useIntlayer("dashboard-categories");
    return (
        <button
            aria-label={copy.symbol.value}
            className="border-border hover:bg-muted flex size-16 shrink-0 items-center justify-center rounded-2xl border border-dashed text-[28px] leading-none"
            onClick={onClick}
            type="button"
        >
            {symbol.emoji ?? null}
            {symbol.icon ? <LookTile look={{ ...symbol, color }} size="lg" /> : null}
            {symbol.emoji || symbol.icon ? null : <RiAddLine size={22} />}
        </button>
    );
}

function ParentField({
    onChange,
    parents,
    value,
}: {
    onChange: (parentId: string | null) => void;
    parents: readonly Category[];
    value: string | null;
}) {
    const copy = useIntlayer("dashboard-categories");
    const labelId = useId();
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" id={labelId}>
                {copy.parent}
            </span>
            <Select
                items={[
                    { label: copy.none.value, value: NO_PARENT },
                    ...parents.map((row) => ({ label: row.name ?? "", value: row.localId })),
                ]}
                onValueChange={(next) => onChange(!next || next === NO_PARENT ? null : next)}
                value={value ?? NO_PARENT}
            >
                <Select.Trigger aria-labelledby={labelId} className="w-full">
                    <Select.Value />
                </Select.Trigger>
                <Select.Content className="app-shell">
                    <Select.Item value={NO_PARENT}>{copy.none}</Select.Item>
                    {parents.map((row) => (
                        <Select.Item key={row.localId} value={row.localId}>
                            {row.name}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </div>
    );
}

function ColorField({ onPick, value }: { onPick: (hex: string) => void; value: string }) {
    const copy = useIntlayer("dashboard-categories");
    return (
        <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">{copy.color}</legend>
            <div className="flex flex-wrap gap-2">
                {CATEGORY_PALETTE.map((hex) => (
                    <button
                        aria-label={hex}
                        aria-pressed={value === hex}
                        className="size-8 rounded-full ring-offset-2 ring-offset-(--color-background) aria-pressed:ring-2 aria-pressed:ring-(--color-foreground)"
                        key={hex}
                        onClick={() => onPick(hex)}
                        style={{ background: hex }}
                        type="button"
                    />
                ))}
            </div>
        </fieldset>
    );
}

function resolvedColor({
    doc,
    income,
    live,
    parent,
    picked,
}: {
    doc: Category | null;
    income: boolean;
    live: readonly Category[];
    parent: Category | null;
    picked: string | null;
}) {
    if (income) {
        return doc?.color ?? INCOME_COLOR;
    }
    const used = new Set(
        live.flatMap((row) => (!row.income && row.color && row.localId !== doc?.localId ? [row.color] : []))
    );
    return parent?.color ?? picked ?? firstAvailableColor(used);
}

function editorMode(doc: Category | null, startParent: string | null, forcedIncome: boolean) {
    if (doc) {
        return doc.parentId === null ? "editCategory" : "editSubcategory";
    }
    if (startParent !== null) {
        return "newSubcategory";
    }
    return forcedIncome ? "newIncome" : "newCategory";
}

export function CategoryEditor({ onClose, target }: { onClose: () => void; target: EditorTarget }) {
    const copy = useIntlayer("dashboard-categories");
    const { ledger } = useDashboard();
    const writes = useCategoryWrites();
    const rows = ledger.books.categories;
    const live = liveCategories(rows);
    const doc = "doc" in target ? target.doc : null;
    const nameId = useId();

    const start = doc ?? target;
    const startParent = "parentId" in start ? start.parentId : null;
    const startIncome = "income" in start && start.income;
    const expenseCount = live.filter((row) => !row.income).length;
    const [openedAtLimit] = useState(expenseCount >= MAX_EXPENSE_CATEGORIES);
    const forcedIncome = !doc && startParent === null && openedAtLimit;

    const [name, setName] = useState(doc?.name ?? "");
    const [symbol, setSymbol] = useState<CategorySymbol>({ emoji: doc?.emoji ?? null, icon: doc?.icon ?? null });
    const [formIncome, setIncome] = useState(startIncome || forcedIncome);
    const [parentId, setParentId] = useState(startParent);
    const [picked, setPicked] = useState(doc?.color ?? null);
    const [picking, setPicking] = useState(false);
    const [problem, setProblem] = useState<ReturnType<typeof categoryProblem>>(null);

    const parent = live.find((row) => row.localId === parentId) ?? null;
    const income = parent ? parent.income : formIncome;
    const color = resolvedColor({ doc, income, live, parent, picked });
    const hasChildren = Boolean(doc && live.some((row) => row.parentId === doc.localId));
    const parents = categoryTree(rows, income).filter((row) => row.localId !== doc?.localId);

    const mode = editorMode(doc, startParent, forcedIncome);
    const titles = {
        editCategory: copy.editCategory,
        editSubcategory: copy.editSubcategory,
        newCategory: copy.newCategory,
        newIncome: copy.newIncome,
        newSubcategory: copy.newSubcategory,
    };
    let submitLabel: ReactNode = copy.add;
    if (doc) {
        submitLabel = copy.save;
    } else if (startParent !== null) {
        submitLabel = copy.addSub;
    }

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const found = categoryProblem(rows, { ...symbol, income, name }, doc);
        setProblem(found);
        if (found) {
            return;
        }
        const draft = {
            ...symbol,
            color,
            income,
            name,
            parentId: parent?.localId ?? null,
            preset: doc?.preset ?? null,
        };
        if (doc) {
            writes.update(doc, draft);
        } else {
            writes.add(draft);
        }
        onClose();
    };

    return (
        <Dialog onOpenChange={(open) => open || onClose()} open>
            <Dialog.Content className="app-shell">
                <form onSubmit={submit}>
                    <Dialog.Header>
                        <Dialog.Title>{titles[mode]}</Dialog.Title>
                    </Dialog.Header>
                    <Dialog.Body className="flex flex-col gap-4">
                        {forcedIncome ? (
                            <p className="bg-muted rounded-[10px] px-3 py-2 text-[13px]">
                                {copy.atLimit({ max: MAX_EXPENSE_CATEGORIES, used: expenseCount })}
                            </p>
                        ) : null}
                        <div className="flex items-end gap-3">
                            <SymbolButton color={color} onClick={() => setPicking(true)} symbol={symbol} />
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                                <label className="text-sm font-medium" htmlFor={nameId}>
                                    {copy.name}
                                </label>
                                <Input
                                    autoFocus
                                    className="max-sm:text-base"
                                    id={nameId}
                                    name="name"
                                    onChange={(event) => setName(event.target.value)}
                                    value={name}
                                />
                            </div>
                        </div>
                        {forcedIncome || startParent !== null || doc ? null : (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-sm font-medium">{copy.type}</span>
                                <div>
                                    <Segments
                                        onPick={(value) => {
                                            setIncome(value === "income");
                                            setParentId(null);
                                        }}
                                        options={[
                                            { label: copy.expense, value: "expense" },
                                            { label: copy.income, value: "income" },
                                        ]}
                                        value={income ? "income" : "expense"}
                                    />
                                </div>
                            </div>
                        )}
                        {hasChildren || forcedIncome ? null : (
                            <ParentField onChange={setParentId} parents={parents} value={parentId} />
                        )}
                        {parent ? (
                            <p className="text-muted-foreground text-[13px]">
                                {copy.inheritsColor({ parent: parent.name ?? "" })}
                            </p>
                        ) : null}
                        {income || parent ? null : <ColorField onPick={setPicked} value={color} />}
                        {problem ? (
                            <p className="text-destructive text-[13px]" role="alert">
                                {copy.problems[problem]}
                            </p>
                        ) : null}
                    </Dialog.Body>
                    <Dialog.Footer>
                        {doc ? (
                            <Button
                                className="text-destructive mr-auto"
                                onClick={() => {
                                    writes.remove(doc.localId);
                                    onClose();
                                }}
                                type="button"
                                variant="outline"
                            >
                                {copy.delete}
                            </Button>
                        ) : null}
                        <Button onClick={onClose} type="button" variant="outline">
                            {copy.cancel}
                        </Button>
                        <Button type="submit">{submitLabel}</Button>
                    </Dialog.Footer>
                </form>
                {picking ? (
                    <SymbolDialog color={color} onClose={() => setPicking(false)} onPick={setSymbol} value={symbol} />
                ) : null}
            </Dialog.Content>
        </Dialog>
    );
}
