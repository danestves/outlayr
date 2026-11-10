import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import ArrowDownLeft01Icon from "@hugeicons/core-free-icons/ArrowDownLeft01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import BalanceScaleIcon from "@hugeicons/core-free-icons/BalanceScaleIcon";
import Calendar01Icon from "@hugeicons/core-free-icons/Calendar01Icon";
import Calendar02Icon from "@hugeicons/core-free-icons/Calendar02Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import DivideSignIcon from "@hugeicons/core-free-icons/DivideSignIcon";
import GridIcon from "@hugeicons/core-free-icons/GridIcon";
import HierarchyIcon from "@hugeicons/core-free-icons/HierarchyIcon";
import Store01Icon from "@hugeicons/core-free-icons/Store01Icon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Menu } from "panelui-web/menu";
import type { ReactNode } from "react";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { shiftPeriodKey } from "@/lib/dashboard-series-period";

import type { Definition, Dimension, Grouping, Measure, ReportRange, Span } from "./model";
import { spanOf } from "./model";
import type { ReportsPatch } from "./search";
import { searchOf } from "./search";
import type { ReportWords } from "./words";

type Icon = Parameters<typeof Glyph>[0]["icon"];

const DIMENSION_ICONS = {
    account: CreditCardIcon,
    category: Tag01Icon,
    merchant: Store01Icon,
    subcategory: HierarchyIcon,
    tag: GridIcon,
} as const satisfies Record<Dimension, Icon>;

const GROUPING_ICONS = {
    month: Calendar03Icon,
    none: CancelCircleIcon,
    quarter: Calendar03Icon,
    week: Calendar01Icon,
    year: Calendar02Icon,
} as const satisfies Record<Grouping, Icon>;

const MEASURE_ICONS = {
    average: DivideSignIcon,
    count: GridIcon,
    income: ArrowDownLeft01Icon,
    net: BalanceScaleIcon,
    spending: ArrowUpRight01Icon,
} as const satisfies Record<Measure, Icon>;

const DIMENSION_ORDER = [
    "category",
    "subcategory",
    "merchant",
    "tag",
    "account",
] as const satisfies readonly Dimension[];
const GROUPING_ORDER = ["week", "month", "quarter", "year", "none"] as const satisfies readonly Grouping[];
const MEASURE_ORDER = ["spending", "income", "net", "count", "average"] as const satisfies readonly Measure[];

export const dimensionIcon = (dimension: Dimension) => DIMENSION_ICONS[dimension];

const CHIP =
    "data-[popup-open]:bg-muted data-[popup-open]:border-app-strong h-8 gap-1.5 rounded-full px-3 text-sm font-medium [&_svg]:size-3.5!";
const RADIO = "data-[checked]:bg-muted [&_svg]:text-app-tint";
const LIST = "max-h-72 overflow-y-auto";
const CAPTION = "text-muted-foreground px-2 pt-1.5 pb-0.5 text-xs leading-4";
const CHEVRON = <Glyph className="text-muted-foreground" icon={ArrowDown01Icon} size={14} />;

function ChipFace({ caption, children, icon }: { caption?: ReactNode; children: ReactNode; icon?: Icon }) {
    return (
        <>
            {icon ? <Glyph className="text-muted-foreground" icon={icon} size={14} /> : null}
            {caption ? <span className="text-muted-foreground text-[13px] font-normal">{caption}</span> : null}
            {children}
            {CHEVRON}
        </>
    );
}

interface Choice<Value extends string> {
    divider?: boolean;
    icon: Icon;
    name: string;
    value: Value;
}

interface ChoiceMenuProps<Value extends string> {
    caption: string;
    choices: readonly Choice<Value>[];
    onChange: (value: Value) => void;
    value: Value;
    width: string;
}

function ChoiceMenu<Value extends string>({ caption, choices, onChange, value, width }: ChoiceMenuProps<Value>) {
    const shown = choices.find((choice) => choice.value === value);
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP} variant="outline" />}>
                <ChipFace caption={caption}>{shown?.name}</ChipFace>
            </Menu.Trigger>
            <Menu.Content align="start" className={`app-shell ph-no-capture ${width}`} sideOffset={6}>
                <div className={CAPTION}>{caption}</div>
                <Menu.RadioGroup
                    onValueChange={(next) => {
                        const picked = choices.find((choice) => choice.value === next);
                        if (picked) {
                            onChange(picked.value);
                        }
                    }}
                    value={value}
                >
                    {choices.map((choice) => (
                        <div key={choice.value}>
                            {choice.divider ? <Menu.Separator /> : null}
                            <Menu.RadioItem className={RADIO} closeOnClick value={choice.value}>
                                <Glyph icon={choice.icon} size={16} />
                                {choice.name}
                            </Menu.RadioItem>
                        </div>
                    ))}
                </Menu.RadioGroup>
            </Menu.Content>
        </Menu>
    );
}

interface RangeMenuProps {
    bounds: { current: string; earliest: string };
    range: ReportRange;
    onChange: (range: ReportRange) => void;
    words: ReportWords;
}

function monthsBetween(earliest: string, current: string) {
    const months: string[] = [];
    for (let month = current; month >= earliest; month = shiftPeriodKey(month, -1)) {
        months.push(month);
    }
    return months;
}

function RangeMenu({ bounds, onChange, range, words }: RangeMenuProps) {
    const { copy } = words;
    const span = spanOf(range, bounds.current);
    const year = Number(bounds.current.slice(0, 4));
    const months = monthsBetween(bounds.earliest, bounds.current);
    const presets: { name: string; range: ReportRange }[] = [
        { name: copy.range.last({ count: "3" }).value, range: { last: 3 } },
        { name: copy.range.last({ count: "6" }).value, range: { last: 6 } },
        { name: copy.range.last({ count: "12" }).value, range: { last: 12 } },
        { name: copy.range.thisYear.value, range: { from: `${year}-01`, to: `${year}-12` } },
        { name: copy.range.lastYear.value, range: { from: `${year - 1}-01`, to: `${year - 1}-12` } },
        { name: copy.range.allTime.value, range: { from: bounds.earliest, to: bounds.current } },
    ];
    const edge = (side: keyof Span, label: string) => (
        <Menu.Sub>
            <Menu.SubTrigger end={<span className="dash-figure text-xs">{words.fmt.month(span[side])}</span>}>
                {label}
            </Menu.SubTrigger>
            <Menu.SubContent className={`app-shell ${LIST} w-44`}>
                <Menu.RadioGroup
                    onValueChange={(next) => {
                        const from = side === "from" ? next : span.from;
                        const to = side === "to" ? next : span.to;
                        onChange(from <= to ? { from, to } : { from: next, to: next });
                    }}
                    value={span[side]}
                >
                    {months.map((month) => (
                        <Menu.RadioItem className={RADIO} closeOnClick key={month} value={month}>
                            {words.rangeName({ from: month, to: month })}
                        </Menu.RadioItem>
                    ))}
                </Menu.RadioGroup>
            </Menu.SubContent>
        </Menu.Sub>
    );
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP} variant="outline" />}>
                <ChipFace icon={Calendar03Icon}>
                    <span>{words.rangeName(span)}</span>
                </ChipFace>
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture w-[230px]" sideOffset={6}>
                {presets.map((preset) => (
                    <Menu.Item key={preset.name} onClick={() => onChange(preset.range)}>
                        {preset.name}
                    </Menu.Item>
                ))}
                <Menu.Separator />
                {edge("from", copy.range.from.value)}
                {edge("to", copy.range.to.value)}
            </Menu.Content>
        </Menu>
    );
}

interface AccountsMenuProps {
    accounts: readonly { id: string; name: string }[];
    chosen: readonly string[];
    onChange: (ids: string[]) => void;
    words: ReportWords;
}

function AccountsMenu({ accounts, chosen, onChange, words }: AccountsMenuProps) {
    const { copy } = words;
    const first = accounts.find((account) => account.id === chosen[0]);
    let name: string = copy.accounts.all.value;
    if (chosen.length === 1 && first) {
        ({ name } = first);
    } else if (chosen.length > 1) {
        name = copy.accounts.count({ count: String(chosen.length) }).value;
    }
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP} variant="outline" />}>
                <ChipFace icon={CreditCardIcon}>{name}</ChipFace>
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture w-[240px]" sideOffset={6}>
                <Menu.Item closeOnClick={false} onClick={() => onChange([])}>
                    {copy.accounts.all}
                </Menu.Item>
                <Menu.Separator />
                <div className={LIST}>
                    {accounts.map((account) => (
                        <Menu.CheckboxItem
                            checked={chosen.includes(account.id)}
                            key={account.id}
                            onCheckedChange={(on) =>
                                onChange(on ? [...chosen, account.id] : chosen.filter((id) => id !== account.id))
                            }
                        >
                            <span className="min-w-0 truncate">{account.name}</span>
                        </Menu.CheckboxItem>
                    ))}
                </div>
            </Menu.Content>
        </Menu>
    );
}

export interface TagChoice {
    id: string;
    name: string;
}

interface FilterMenuProps {
    chosen: readonly string[];
    onChange: (ids: string[]) => void;
    tags: readonly TagChoice[];
    words: ReportWords;
}

function FilterMenu({ chosen, onChange, tags, words }: FilterMenuProps) {
    const { chips } = words.copy;
    return (
        <Menu>
            <Menu.Trigger render={<Button className={CHIP} variant="outline" />}>
                <Glyph className="text-muted-foreground" icon={Add01Icon} size={14} />
                {chips.filter}
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture w-[240px]" sideOffset={6}>
                <div className={CAPTION}>{chips.tags}</div>
                {tags.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-1.5 text-[13px]">{chips.tagsNone}</p>
                ) : (
                    <div className={LIST}>
                        {tags.map((tag) => (
                            <Menu.CheckboxItem
                                checked={chosen.includes(tag.id)}
                                key={tag.id}
                                onCheckedChange={(on) =>
                                    onChange(on ? [...chosen, tag.id] : chosen.filter((id) => id !== tag.id))
                                }
                            >
                                <Glyph icon={GridIcon} size={16} />
                                {tag.name}
                            </Menu.CheckboxItem>
                        ))}
                    </div>
                )}
            </Menu.Content>
        </Menu>
    );
}

export interface ToolbarProps {
    accounts: readonly { id: string; name: string }[];
    bounds: { current: string; earliest: string };
    definition: Definition;
    onAccounts: (ids: string[]) => void;
    onPatch: (patch: ReportsPatch) => void;
    tags: readonly TagChoice[];
    words: ReportWords;
}

/** The sentence a report is built from: rows by columns over a range, narrowed by filters, read as a measure. */
export function Toolbar({ accounts, bounds, definition, onAccounts, onPatch, tags, words }: ToolbarProps) {
    const { copy } = words;
    const change = (next: Partial<Definition>) => onPatch(searchOf({ ...definition, ...next }));
    const dimensions = DIMENSION_ORDER.map((value) => ({
        icon: DIMENSION_ICONS[value],
        name: copy.dimensions[value].value,
        value,
    }));
    const groupings = GROUPING_ORDER.map((value) => ({
        divider: value === "none",
        icon: GROUPING_ICONS[value],
        name: copy.groupings[value].name.value,
        value,
    }));
    const measures = MEASURE_ORDER.map((value) => ({
        divider: value === "count",
        icon: MEASURE_ICONS[value],
        name: copy.measures[value].value,
        value,
    }));
    const chosenTags = tags.filter((tag) => definition.tags.includes(tag.id));
    return (
        <div className="flex min-h-[60px] shrink-0 flex-wrap items-center gap-2 py-3.5">
            <ChoiceMenu
                caption={copy.chips.rows.value}
                choices={dimensions}
                onChange={(rows) => change({ rows })}
                value={definition.rows}
                width="w-[250px]"
            />
            <ChoiceMenu
                caption={copy.chips.columns.value}
                choices={groupings}
                onChange={(columns) => change({ columns })}
                value={definition.columns}
                width="w-[210px]"
            />
            <RangeMenu bounds={bounds} onChange={(range) => change({ range })} range={definition.range} words={words} />
            <AccountsMenu accounts={accounts} chosen={definition.accounts} onChange={onAccounts} words={words} />
            {chosenTags.map((tag) => (
                <Chip
                    className="gap-1.5"
                    color="primary"
                    key={tag.id}
                    onRemove={() => change({ tags: definition.tags.filter((id) => id !== tag.id) })}
                    removeLabel={copy.chips.removeTag({ name: tag.name }).value}
                    size="lg"
                >
                    <Glyph icon={GridIcon} size={14} />
                    {tag.name}
                </Chip>
            ))}
            <FilterMenu
                chosen={definition.tags}
                onChange={(next) => change({ tags: next })}
                tags={tags}
                words={words}
            />
            <div className="ml-auto">
                <ChoiceMenu
                    caption={copy.chips.measure.value}
                    choices={measures}
                    onChange={(measure) => change({ measure })}
                    value={definition.measure}
                    width="w-[270px]"
                />
            </div>
        </div>
    );
}
