import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import Dollar01Icon from "@hugeicons/core-free-icons/Dollar01Icon";
import DragDropVerticalIcon from "@hugeicons/core-free-icons/DragDropVerticalIcon";
import HashtagIcon from "@hugeicons/core-free-icons/HashtagIcon";
import LayoutTable01Icon from "@hugeicons/core-free-icons/LayoutTable01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import SortingDownIcon from "@hugeicons/core-free-icons/SortingDownIcon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import TickDouble02Icon from "@hugeicons/core-free-icons/TickDouble02Icon";
import UserMultipleIcon from "@hugeicons/core-free-icons/UserMultipleIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { currencyDisplayFor, decimalsFor } from "@outlayr/money/currency";
import { Avatar } from "panelui-web/avatar";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Switch } from "panelui-web/switch";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode, RefObject } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { CHIP } from "@/components/dashboard/shell/top-bar";
import { MerchantTile } from "@/components/ledger/tiles";
import { MenuContent } from "@/components/ui/menu-content";
import { parseAmount } from "@/lib/account-writes";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { AccountMenu, CategoryMenu } from "../home/filter-bar";
import { COLUMNS } from "./columns";
import type { Column, LayoutControls } from "./columns";
import { NO_TAG, SORTS } from "./model";
import type { Sort } from "./model";
import { PeriodChip } from "./period-chip";
import { merchantParam } from "./search";
import type { PageQuery, SearchPatch } from "./search";

const FIGURE = "font-mono tabular-nums text-muted-foreground text-app-label ms-auto ps-3";
const NO_CHECK = "[&>[data-slot=chip-check]]:hidden";
const SORT_GROUPS: readonly (readonly Sort[])[] = [
    ["newest", "oldest"],
    ["largest", "smallest"],
    ["merchant", "category"],
];

export interface PickOption {
    count: number;
    id: string;
    imageUrl?: string;
    name: string;
}

interface PickMenuProps {
    icon: IconSvgElement;
    label: ReactNode;
    onChange: (ids: readonly string[]) => void;
    options: readonly PickOption[];
    picked: readonly string[];
    searchLabel: string;
    renderTile: (option: PickOption) => ReactNode;
}

function PickMenu({ icon, label, onChange, options, picked, renderTile, searchLabel }: PickMenuProps) {
    const { filters: copy } = useIntlayer("dashboard");
    const [needle, setNeedle] = useState("");
    const query = needle.trim().toLocaleLowerCase();
    const shown = options.filter((option) => option.name.toLocaleLowerCase().includes(query));
    const on = picked.length > 0;
    return (
        <Menu onOpenChange={(open) => (open ? null : setNeedle(""))}>
            <Menu.Trigger
                render={
                    <Chip
                        className={`${CHIP} shrink-0 ${NO_CHECK}`}
                        data-pressed={on ? "" : undefined}
                        pressed={on}
                        size="lg"
                    />
                }
            >
                <HugeiconsIcon icon={on ? icon : Add01Icon} strokeWidth={1.5} />
                {label}
                {on ? <span className="font-mono tabular-nums">{picked.length}</span> : null}
            </Menu.Trigger>
            <MenuContent align="start" className="w-64" sideOffset={8}>
                <Input.Group className="mb-1.5">
                    <Input.Addon>
                        <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={2} />
                    </Input.Addon>
                    <Input
                        aria-label={searchLabel}
                        autoFocus
                        onChange={(event) => setNeedle(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key !== "Escape" && event.key !== "ArrowDown" && event.key !== "ArrowUp") {
                                event.stopPropagation();
                            }
                        }}
                        placeholder={searchLabel}
                        value={needle}
                    />
                </Input.Group>
                <div className="max-h-72 overflow-y-auto">
                    {shown.map((option) => (
                        <Menu.CheckboxItem
                            checked={picked.includes(option.id)}
                            closeOnClick={false}
                            key={option.id}
                            onCheckedChange={(checked) =>
                                onChange(checked ? [...picked, option.id] : picked.filter((each) => each !== option.id))
                            }
                        >
                            {renderTile(option)}
                            <span className="truncate">{option.name}</span>
                            <span className={FIGURE}>{option.count}</span>
                        </Menu.CheckboxItem>
                    ))}
                </div>
                <Menu.Separator />
                <Menu.Item closeOnClick={false} disabled={!on} onClick={() => onChange([])}>
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                    {copy.clear}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

type AmountMode = "between" | "over" | "under";

function AmountMenu({ query, setSearch }: { query: PageQuery; setSearch: (patch: SearchPatch) => void }) {
    const { ledger } = useDashboard();
    const { filters: words } = useIntlayer("dashboard-ledger");
    const { filters: copy } = useIntlayer("dashboard");
    const amountLabel = useAmountLabel();
    const on = query.min !== null || query.max !== null;
    const initialMode = (): AmountMode => {
        if (query.min !== null && query.max !== null) {
            return "between";
        }
        return query.min === null ? "under" : "over";
    };
    const [mode, setMode] = useState<AmountMode>(initialMode);
    const [minText, setMinText] = useState(query.min === null ? "" : String(query.min));
    const [maxText, setMaxText] = useState(query.max === null ? "" : String(query.max));
    const [open, setOpen] = useState(false);
    const decimals = decimalsFor(ledger.currency);
    const amountOf = (text: string) => (text.trim() === "" ? null : parseAmount(text, decimals));
    const min = mode === "under" ? null : amountOf(minText);
    const max = mode === "over" ? null : amountOf(maxText);
    const crossed = min !== null && max !== null && max <= min;
    const ready = !crossed && (min !== null || max !== null);
    const field = (key: "max" | "min") => (
        <Field invalid={key === "max" && crossed}>
            {mode === "between" ? <Field.Label>{words[key]}</Field.Label> : null}
            <Input.Group>
                <Input.Addon className="text-muted-foreground font-mono">
                    {currencyDisplayFor(ledger.currency).symbol}
                </Input.Addon>
                <Input
                    aria-invalid={(key === "max" && crossed) || undefined}
                    aria-label={words[key].value}
                    className="font-mono tabular-nums"
                    inputMode="decimal"
                    onChange={(event) => (key === "min" ? setMinText : setMaxText)(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== "Escape") {
                            event.stopPropagation();
                        }
                    }}
                    value={key === "min" ? minText : maxText}
                />
            </Input.Group>
        </Field>
    );
    return (
        <Menu
            onOpenChange={(next) => {
                setOpen(next);
                if (next) {
                    setMode(initialMode());
                    setMinText(query.min === null ? "" : String(query.min));
                    setMaxText(query.max === null ? "" : String(query.max));
                }
            }}
            open={open}
        >
            <Menu.Trigger
                render={
                    <Chip
                        className={`${CHIP} shrink-0 ${NO_CHECK}`}
                        data-pressed={on ? "" : undefined}
                        pressed={on}
                        size="lg"
                    />
                }
            >
                <HugeiconsIcon icon={on ? Dollar01Icon : Add01Icon} strokeWidth={1.5} />
                {on ? amountLabel(query) : words.amount}
            </Menu.Trigger>
            <MenuContent align="start" className="w-72" sideOffset={8}>
                <form
                    className="flex flex-col gap-3 p-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (ready) {
                            setSearch({
                                max: max === null ? null : String(max),
                                min: min === null ? null : String(min),
                            });
                            setOpen(false);
                        }
                    }}
                >
                    <Tabs onValueChange={(value: string) => setMode(modeOf(value))} value={mode} variant="segmented">
                        <Tabs.List className="w-full">
                            <Tabs.Trigger className="flex-1" value="under">
                                {words.under}
                            </Tabs.Trigger>
                            <Tabs.Trigger className="flex-1" value="over">
                                {words.over}
                            </Tabs.Trigger>
                            <Tabs.Trigger className="flex-1" value="between">
                                {words.between}
                            </Tabs.Trigger>
                        </Tabs.List>
                    </Tabs>
                    {mode === "between" ? (
                        <div className="grid grid-cols-2 gap-2">
                            {field("min")}
                            {field("max")}
                        </div>
                    ) : (
                        field(mode === "under" ? "max" : "min")
                    )}
                    {crossed ? <p className="text-destructive text-app-caption">{words.maxBelowMin}</p> : null}
                    <div className="flex justify-end gap-2">
                        {on ? (
                            <Button
                                onClick={() => {
                                    setSearch({ max: null, min: null });
                                    setOpen(false);
                                }}
                                size="sm"
                                variant="ghost"
                            >
                                {copy.clear}
                            </Button>
                        ) : null}
                        <Button disabled={!ready} size="sm" type="submit">
                            {words.apply}
                        </Button>
                    </div>
                </form>
            </MenuContent>
        </Menu>
    );
}

const modeOf = (value: string): AmountMode => (value === "over" || value === "between" ? value : "under");

export function useAmountLabel() {
    const { ledger } = useDashboard();
    const { filters: words } = useIntlayer("dashboard-ledger");
    const { money } = useDisplayFormat();
    return ({ max, min }: Pick<PageQuery, "max" | "min">) => {
        if (min !== null && max !== null) {
            return words.amountBetween({ max: money(max, ledger.currency), min: money(min, ledger.currency) }).value;
        }
        if (min !== null) {
            return words.amountOver({ amount: money(min, ledger.currency) }).value;
        }
        return max === null ? "" : words.amountUnder({ amount: money(max, ledger.currency) }).value;
    };
}

function SortMenu({ setSearch, sort }: { setSearch: (patch: SearchPatch) => void; sort: Sort }) {
    const { sort: words } = useIntlayer("dashboard-ledger");
    return (
        <Menu>
            <Menu.Trigger render={<Button size="sm" variant="ghost" />}>
                <HugeiconsIcon icon={SortingDownIcon} strokeWidth={2} />
                {words[sort]}
            </Menu.Trigger>
            <MenuContent align="end" className="w-52" sideOffset={8}>
                <Menu.RadioGroup
                    onValueChange={(value: string) => {
                        const next = SORTS.find((each) => each === value);
                        if (next) {
                            setSearch({ sort: next === "newest" ? null : next });
                        }
                    }}
                    value={sort}
                >
                    {SORT_GROUPS.map((group, index) => (
                        <div key={group[0]}>
                            {index > 0 ? <Menu.Separator /> : null}
                            {group.map((each) => (
                                <Menu.RadioItem closeOnClick key={each} value={each}>
                                    {words[each]}
                                </Menu.RadioItem>
                            ))}
                        </div>
                    ))}
                </Menu.RadioGroup>
            </MenuContent>
        </Menu>
    );
}

function ColumnsMenu({ layout, showLoggedBy }: { layout: LayoutControls; showLoggedBy: boolean }) {
    const { columns: words } = useIntlayer("dashboard-ledger");
    return (
        <Menu>
            <Menu.Trigger render={<Button size="sm" variant="ghost" />}>
                <HugeiconsIcon icon={LayoutTable01Icon} strokeWidth={2} />
                {words.label}
            </Menu.Trigger>
            <MenuContent align="end" className="w-64" sideOffset={8}>
                <Menu.Group>
                    <Menu.GroupLabel>{words.density}</Menu.GroupLabel>
                    <div className="px-1 pb-1">
                        <Tabs
                            onValueChange={(value: string) =>
                                layout.setDensity(value === "compact" ? "compact" : "comfortable")
                            }
                            value={layout.density}
                            variant="segmented"
                        >
                            <Tabs.List className="w-full">
                                <Tabs.Trigger className="flex-1" value="compact">
                                    {words.compact}
                                </Tabs.Trigger>
                                <Tabs.Trigger className="flex-1" value="comfortable">
                                    {words.comfortable}
                                </Tabs.Trigger>
                            </Tabs.List>
                        </Tabs>
                    </div>
                </Menu.Group>
                <Menu.Separator />
                <Menu.Group>
                    <Menu.GroupLabel>{words.label}</Menu.GroupLabel>
                    {COLUMNS.filter((column) => column !== "loggedBy" || showLoggedBy).map((column) => (
                        <ColumnRow column={column} key={column} layout={layout} />
                    ))}
                </Menu.Group>
                <Menu.Separator />
                <Menu.Item closeOnClick={false} onClick={layout.reset}>
                    {words.reset}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

function ColumnRow({ column, layout }: { column: Column; layout: LayoutControls }) {
    const { columns: words } = useIntlayer("dashboard-ledger");
    return (
        <Menu.Item className="gap-2" closeOnClick={false} onClick={() => layout.toggle(column)}>
            <HugeiconsIcon className="text-muted-foreground" icon={DragDropVerticalIcon} strokeWidth={2} />
            {words[column]}
            <Switch checked={layout.shown(column)} className="pointer-events-none ms-auto" size="sm" tabIndex={-1} />
        </Menu.Item>
    );
}

interface FilterRowProps {
    by: readonly string[];
    layout: LayoutControls;
    merchants: readonly PickOption[];
    onMarkAll: (() => void) | null;
    people: readonly PickOption[];
    query: PageQuery;
    searchField: RefObject<HTMLInputElement | null>;
    setSearch: (patch: SearchPatch, options?: { replace?: boolean }) => void;
    tags: readonly PickOption[];
    transfers: boolean;
}

export function FilterRow({
    by,
    layout,
    merchants,
    onMarkAll,
    people,
    query,
    searchField,
    setSearch,
    tags,
    transfers,
}: FilterRowProps) {
    const { filters: words, review } = useIntlayer("dashboard-ledger");
    return (
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2.5">
            <Input.Group className="w-48 max-w-full" size="sm">
                <Input.Addon>
                    <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} />
                </Input.Addon>
                <Input
                    aria-label={transfers ? words.searchTransfers.value : words.search.value}
                    onChange={(event) => setSearch({ q: event.target.value }, { replace: true })}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.currentTarget.blur();
                        }
                    }}
                    placeholder={transfers ? words.searchTransfers.value : words.search.value}
                    ref={searchField}
                    enterKeyHint="search"
                    value={query.q}
                />
                <Input.Addon align="end" className="pointer-coarse:hidden">
                    <kbd className="text-app-micro">/</kbd>
                </Input.Addon>
            </Input.Group>
            <PeriodChip query={query} setSearch={setSearch} />
            <AccountMenu quiet={false} />
            {transfers ? null : (
                <>
                    <CategoryMenu />
                    <PickMenu
                        icon={HashtagIcon}
                        label={words.tag}
                        onChange={(ids) => setSearch({ tags: ids.length === 0 ? null : ids.join(",") })}
                        options={tags}
                        picked={query.tags}
                        searchLabel={words.searchTags.value}
                        renderTile={(option) => (
                            <span className="text-muted-foreground font-mono">{option.id === NO_TAG ? "∅" : "#"}</span>
                        )}
                    />
                </>
            )}
            {people.length > 1 ? (
                <PickMenu
                    icon={UserMultipleIcon}
                    label={words.loggedBy}
                    onChange={(ids) => setSearch({ by: ids.length === 0 ? null : ids.join(",") })}
                    options={people}
                    picked={by}
                    searchLabel={words.searchPeople.value}
                    renderTile={(option) => <Avatar name={option.name} size="xs" />}
                />
            ) : null}
            <AmountMenu query={query} setSearch={setSearch} />
            {transfers ? null : (
                <PickMenu
                    icon={Store01Icon}
                    label={words.merchant}
                    onChange={(ids) => setSearch({ merchant: merchantParam(ids) })}
                    options={merchants}
                    picked={query.merchants}
                    searchLabel={words.searchMerchants.value}
                    renderTile={(option) => <MerchantTile imageUrl={option.imageUrl} name={option.name} size="xs" />}
                />
            )}
            <span className="ms-auto flex items-center gap-1">
                <SortMenu setSearch={setSearch} sort={query.sort} />
                {onMarkAll ? (
                    <Button onClick={onMarkAll} size="sm" variant="ghost">
                        <HugeiconsIcon icon={TickDouble02Icon} strokeWidth={2} />
                        {review.markAll}
                    </Button>
                ) : (
                    <ColumnsMenu layout={layout} showLoggedBy={people.length > 1} />
                )}
            </span>
        </div>
    );
}
