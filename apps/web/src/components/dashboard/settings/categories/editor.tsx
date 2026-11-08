import { firstAvailableColor, CATEGORY_PALETTE } from "@outlayr/money/category-rules";
import { RiAddLine, RiSearchLine } from "@remixicon/react";
import { Alert } from "panelui-web/alert";
import { Button } from "panelui-web/button";
import { ChoiceCards } from "panelui-web/choice-cards";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Label } from "panelui-web/label";
import { Select } from "panelui-web/select";
import { useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { LookTile } from "@/components/ledger/tiles";

import { Choice } from "../parts";
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
const SYMBOL_GRID = "grid max-h-[300px] grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 overflow-y-auto p-1";
const SYMBOL_CELL = "[&_[data-slot=choice-cards-check]]:hidden";

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
    return (
        <Dialog onOpenChange={(open) => open || onClose()} open>
            <Dialog.Content className="app-shell sm:max-w-[560px]">
                <Dialog.Header>
                    <Dialog.Title>{copy.symbol}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 max-sm:flex-wrap">
                        {tab === "icons" ? (
                            <Input.Group className="min-w-0 flex-1">
                                <Input.Addon>
                                    <RiSearchLine size={15} />
                                </Input.Addon>
                                <Input
                                    aria-label={copy.searchSymbols.value}
                                    className="max-sm:text-base"
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={copy.searchSymbols.value}
                                    value={query}
                                />
                            </Input.Group>
                        ) : (
                            <span className="flex-1" />
                        )}
                        <Choice
                            label={copy.symbol.value}
                            onChange={setTab}
                            options={[
                                { label: copy.icons, value: "icons" },
                                { label: copy.emoji, value: "emoji" },
                            ]}
                            value={tab}
                        />
                    </div>
                    <ChoiceCards
                        aria-label={copy.symbol.value}
                        aspect="1 / 1"
                        className={SYMBOL_GRID}
                        onValueChange={(next) =>
                            pick(tab === "icons" ? { emoji: null, icon: next } : { emoji: next, icon: null })
                        }
                        value={(tab === "icons" ? value.icon : value.emoji) ?? ""}
                    >
                        {tab === "icons"
                            ? keys.map((key) => (
                                  <ChoiceCards.Item aria-label={key} className={SYMBOL_CELL} key={key} value={key}>
                                      <ChoiceCards.Media>
                                          <LookTile look={{ color, emoji: null, icon: key }} />
                                      </ChoiceCards.Media>
                                  </ChoiceCards.Item>
                              ))
                            : EMOJI.map((emoji) => (
                                  <ChoiceCards.Item
                                      aria-label={emoji}
                                      className={SYMBOL_CELL}
                                      key={emoji}
                                      value={emoji}
                                  >
                                      <ChoiceCards.Media className="text-xl">{emoji}</ChoiceCards.Media>
                                  </ChoiceCards.Item>
                              ))}
                    </ChoiceCards>
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
        <Button
            aria-label={copy.symbol.value}
            className="size-16 shrink-0 rounded-2xl border-dashed text-[28px] leading-none"
            onClick={onClick}
            size="icon-lg"
            type="button"
            variant="outline"
        >
            {symbol.emoji ?? null}
            {symbol.icon ? <LookTile look={{ ...symbol, color }} size="lg" /> : null}
            {symbol.emoji || symbol.icon ? null : <RiAddLine size={22} />}
        </Button>
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
    return (
        <Field>
            <Field.Label>{copy.parent}</Field.Label>
            <Select
                items={[
                    { label: copy.none.value, value: NO_PARENT },
                    ...parents.map((row) => ({ label: row.name ?? "", value: row.localId })),
                ]}
                onValueChange={(next) => onChange(!next || next === NO_PARENT ? null : next)}
                value={value ?? NO_PARENT}
            >
                <Select.Trigger className="w-full">
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
        </Field>
    );
}

function ColorField({ onPick, value }: { onPick: (hex: string) => void; value: string }) {
    const copy = useIntlayer("dashboard-categories");
    return (
        <div className="flex flex-col gap-1.5">
            <Label render={<span />}>{copy.color}</Label>
            <ChoiceCards
                aria-label={copy.color.value}
                aspect="1 / 1"
                className="grid grid-cols-[repeat(auto-fill,36px)] gap-2"
                onValueChange={onPick}
                value={value}
            >
                {CATEGORY_PALETTE.map((hex) => (
                    <ChoiceCards.Item aria-label={hex} key={hex} value={hex}>
                        <ChoiceCards.Media style={{ background: hex }} />
                    </ChoiceCards.Item>
                ))}
            </ChoiceCards>
        </div>
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
    const formId = useId();

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
            parentId: hasChildren ? null : (parent?.localId ?? null),
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
                <Dialog.Header>
                    <Dialog.Title>{titles[mode]}</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body>
                    <form className="flex flex-col gap-4" id={formId} onSubmit={submit}>
                        {forcedIncome ? (
                            <Alert variant="plain">
                                <Alert.Description>
                                    {copy.atLimit({ max: MAX_EXPENSE_CATEGORIES, used: expenseCount })}
                                </Alert.Description>
                            </Alert>
                        ) : null}
                        <div className="flex items-start gap-3">
                            <SymbolButton color={color} onClick={() => setPicking(true)} symbol={symbol} />
                            <Field className="min-w-0 flex-1" invalid={problem !== null}>
                                <Field.Label>{copy.name}</Field.Label>
                                <Input
                                    autoFocus
                                    className="max-sm:text-base"
                                    name="name"
                                    onChange={(event) => setName(event.target.value)}
                                    value={name}
                                />
                                {problem ? <Field.Error match>{copy.problems[problem]}</Field.Error> : null}
                            </Field>
                        </div>
                        {forcedIncome || startParent !== null || doc ? null : (
                            <div className="flex flex-col gap-1.5">
                                <Label render={<span />}>{copy.type}</Label>
                                <div>
                                    <Choice
                                        label={copy.type.value}
                                        onChange={(value) => {
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
                    </form>
                </Dialog.Body>
                <Dialog.Footer>
                    {doc ? (
                        <Button
                            className="mr-auto"
                            onClick={() => {
                                writes.remove(doc.localId);
                                onClose();
                            }}
                            type="button"
                            variant="destructive"
                        >
                            {copy.delete}
                        </Button>
                    ) : null}
                    <Button onClick={onClose} type="button" variant="outline">
                        {copy.cancel}
                    </Button>
                    <Button form={formId} type="submit">
                        {submitLabel}
                    </Button>
                </Dialog.Footer>
                {picking ? (
                    <SymbolDialog color={color} onClose={() => setPicking(false)} onPick={setSymbol} value={symbol} />
                ) : null}
            </Dialog.Content>
        </Dialog>
    );
}
