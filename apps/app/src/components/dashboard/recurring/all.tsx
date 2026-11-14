import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import Sorting05Icon from "@hugeicons/core-free-icons/Sorting05Icon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import type { IconSvgElement } from "@hugeicons/react";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { Fragment } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { RecurringModel, Schedule, ScheduleState } from "@/lib/recurring";

import { Glyph } from "../accounts/glyph";
import type { ScheduleActions } from "./menu";
import { ScheduleMenu } from "./menu";
import {
    CELL,
    CategoryBadge,
    FIGURE,
    HEAD,
    MUTED,
    NameCell,
    useAccountName,
    useCategoryLook,
    useChargeMoney,
    useDay,
    useRepeatText,
} from "./parts";
import { ALL_SORTS } from "./search";
import type { AllSort, RecurringSearch, SetRecurringSearch } from "./search";
import { Foot, GroupRow } from "./upcoming";

const STATES: readonly ScheduleState[] = ["active", "paused", "stopped"];

/** The day a schedule is next worth looking at: a charge due today first, else the next one. */
export const nextDayOf = (schedule: Schedule, today: string) =>
    schedule.due.find((charge) => charge.day === today)?.day ?? schedule.next?.day ?? null;

export function StateBadge({ schedule }: { schedule: Schedule }) {
    const { badge } = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const missed = schedule.due.some((charge) => charge.day < ledger.today);
    const today = schedule.due.some((charge) => charge.day === ledger.today);
    if (schedule.state !== "active" || !(missed || today)) {
        return null;
    }
    return (
        <Badge
            className={`h-6 rounded-md px-2 text-xs font-medium ${missed ? "bg-destructive/12 text-destructive" : "bg-app-warn/14 text-app-warn"}`}
            variant="secondary"
        >
            {missed ? badge.missed : badge.today}
        </Badge>
    );
}

export function HeldBadge({ state }: { state: ScheduleState }) {
    const { badge } = useIntlayer("dashboard-recurring");
    return (
        <Badge
            className={`h-6 rounded-md px-2 text-xs font-medium ${state === "paused" ? "bg-app-warn/14 text-app-warn" : "text-muted-foreground"}`}
            variant="secondary"
        >
            {state === "paused" ? badge.paused : badge.stopped}
        </Badge>
    );
}

function FilterMenu({
    icon,
    label,
    onPick,
    options,
    value,
}: {
    icon: IconSvgElement;
    label: ReactNode;
    onPick: (value: string | null) => void;
    options: readonly { label: string; value: string }[];
    value: string | undefined;
}) {
    const { all } = useIntlayer("dashboard-recurring");
    const picked = options.find((option) => option.value === value);
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        className={`rounded-full ${picked ? "border-app-tint/50 bg-app-tint/8" : ""}`}
                        variant="outline"
                    />
                }
            >
                <Glyph icon={icon} className="text-muted-foreground" size={16} />
                <span className="max-w-36 truncate">{picked?.label ?? label}</span>
            </Menu.Trigger>
            <Menu.Content align="start" className="app-shell ph-no-capture max-h-80 w-[220px]" sideOffset={4}>
                {options.map((option) => (
                    <Menu.Item key={option.value} onClick={() => onPick(option.value === value ? null : option.value)}>
                        <span className="truncate">{option.label}</span>
                        <Glyph
                            icon={Tick02Icon}
                            className={`text-app-tint! ml-auto ${option.value === value ? "" : "invisible"}`}
                            size={16}
                        />
                    </Menu.Item>
                ))}
                {picked ? (
                    <>
                        <Menu.Separator />
                        <Menu.Item onClick={() => onPick(null)}>{all.clear}</Menu.Item>
                    </>
                ) : null}
            </Menu.Content>
        </Menu>
    );
}

const repeatKey = (schedule: Schedule) => `${schedule.chain.type}:${schedule.chain.every}`;

const unique = <Item extends { value: string }>(items: Item[]) => [
    ...new Map(items.map((item) => [item.value, item])).values(),
];

export function AllTable({
    actions,
    model,
    search,
    setSearch,
    sort,
}: {
    actions: ScheduleActions;
    model: RecurringModel;
    search: RecurringSearch;
    setSearch: SetRecurringSearch;
    sort: AllSort;
}) {
    const copy = useIntlayer("dashboard-recurring");
    const { ledger } = useDashboard();
    const { locale } = useLocale();
    const days = useDay();
    const repeat = useRepeatText();
    const accountName = useAccountName();
    const categoryLook = useCategoryLook();
    const cash = useChargeMoney();
    const query = (search.q ?? "").trim().toLocaleLowerCase(locale);
    const shown = model.schedules.filter(
        (schedule) =>
            (query === "" ||
                schedule.name.toLocaleLowerCase(locale).includes(query) ||
                (schedule.seed.details ?? "").toLocaleLowerCase(locale).includes(query)) &&
            (search.account === undefined || schedule.seed.accountId === search.account) &&
            (search.category === undefined || schedule.seed.categoryId === search.category) &&
            (search.repeats === undefined || repeatKey(schedule) === search.repeats)
    );
    const order = (a: Schedule, b: Schedule) => {
        if (sort === "amount") {
            return b.worth - a.worth;
        }
        if (sort === "perMonth") {
            return b.perMonth - a.perMonth;
        }
        if (sort === "name") {
            return a.name.localeCompare(b.name, locale);
        }
        return (nextDayOf(a, ledger.today) ?? "9").localeCompare(nextDayOf(b, ledger.today) ?? "9");
    };
    const accounts = unique(
        model.schedules.flatMap((schedule) =>
            schedule.seed.accountId === null
                ? []
                : [{ label: accountName(schedule.seed.accountId), value: schedule.seed.accountId }]
        )
    );
    const categories = unique(
        model.schedules.flatMap((schedule) => {
            const category = categoryLook(schedule.seed.categoryId);
            return category ? [{ label: category.name, value: category.id }] : [];
        })
    );
    const repeats = unique(
        model.schedules.map((schedule) => ({
            label: repeat.short(schedule.chain.type, schedule.chain.every),
            value: repeatKey(schedule),
        }))
    );
    const groups = STATES.map((state) => ({
        rows: shown.filter((schedule) => schedule.state === state).toSorted(order),
        state,
    })).filter((group) => group.rows.length > 0);
    const count = (state: ScheduleState) => model.schedules.filter((schedule) => schedule.state === state).length;
    const perMonth = shown
        .filter((schedule) => !schedule.seed.income)
        .reduce((sum, schedule) => sum + schedule.perMonth, 0);
    const span = 8;
    return (
        <>
            <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3">
                <Input.Group className="w-full sm:w-[278px]">
                    <Input.Addon>
                        <Glyph icon={Search01Icon} className="text-muted-foreground" size={16} />
                    </Input.Addon>
                    <Input
                        aria-label={copy.all.search.value}
                        onChange={(event) => setSearch({ q: event.target.value }, { replace: true })}
                        placeholder={copy.all.search.value}
                        type="search"
                        value={search.q ?? ""}
                    />
                </Input.Group>
                <FilterMenu
                    icon={CreditCardIcon}
                    label={copy.all.account}
                    onPick={(account) => setSearch({ account })}
                    options={accounts}
                    value={search.account}
                />
                <FilterMenu
                    icon={Tag01Icon}
                    label={copy.all.category}
                    onPick={(category) => setSearch({ category })}
                    options={categories}
                    value={search.category}
                />
                <FilterMenu
                    icon={RepeatIcon}
                    label={copy.all.repeats}
                    onPick={(value) => setSearch({ repeats: value })}
                    options={repeats}
                    value={search.repeats}
                />
                <Menu>
                    <Menu.Trigger render={<Button className="ml-auto rounded-full" variant="outline" />}>
                        <Glyph icon={Sorting05Icon} className="text-muted-foreground" size={16} />
                        {copy.all.sort[sort]}
                    </Menu.Trigger>
                    <Menu.Content align="end" className="app-shell ph-no-capture w-[188px]" sideOffset={4}>
                        {ALL_SORTS.map((each) => (
                            <Menu.Item key={each} onClick={() => setSearch({ sort: each === "next" ? null : each })}>
                                {copy.all.sort[each]}
                                <Glyph
                                    icon={Tick02Icon}
                                    className={`text-app-tint! ml-auto ${sort === each ? "" : "invisible"}`}
                                    size={16}
                                />
                            </Menu.Item>
                        ))}
                    </Menu.Content>
                </Menu>
            </div>
            {groups.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-[13px]">
                    {copy.all.noMatch}
                    <Button
                        onClick={() => setSearch({ account: null, category: null, q: null, repeats: null })}
                        size="sm"
                        variant="outline"
                    >
                        {copy.all.clear}
                    </Button>
                </div>
            ) : (
                <Table className="w-full table-fixed" containerClassName="overflow-x-auto">
                    <Table.Header className="in-data-[sticky]:bg-card">
                        <Table.Row className="border-0 hover:bg-transparent">
                            <Table.Head className={`${HEAD} w-[23%] min-w-48`}>{copy.columns.name}</Table.Head>
                            <Table.Head className={`${HEAD} w-[16%] max-lg:hidden`}>{copy.columns.category}</Table.Head>
                            <Table.Head className={`${HEAD} w-[11%] max-xl:hidden`}>{copy.columns.account}</Table.Head>
                            <Table.Head className={`${HEAD} w-[9%] max-md:hidden`}>{copy.columns.repeats}</Table.Head>
                            <Table.Head className={`${HEAD} w-[13%]`}>{copy.columns.nextDate}</Table.Head>
                            <Table.Head align="end" className={`${HEAD} w-[11%] max-sm:hidden`}>
                                {copy.columns.amount}
                            </Table.Head>
                            <Table.Head align="end" className={`${HEAD} w-[11%]`}>
                                {copy.columns.perMonth}
                            </Table.Head>
                            <Table.Head className={`${HEAD} w-14`} />
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {groups.map((group) => (
                            <Fragment key={group.state}>
                                <GroupRow span={span}>{copy.groups[group.state]}</GroupRow>
                                {group.rows.map((schedule) => {
                                    const next = nextDayOf(schedule, ledger.today);
                                    return (
                                        <Table.Row
                                            className={`hover:bg-muted/40 cursor-pointer ${schedule.state === "active" ? "" : "text-muted-foreground"}`}
                                            key={schedule.id}
                                            onClick={() => actions.open(schedule)}
                                        >
                                            <Table.Cell className={CELL}>
                                                <span className="flex min-w-0 items-center gap-2.5">
                                                    <NameCell name={schedule.name} seed={schedule.seed} />
                                                    <StateBadge schedule={schedule} />
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell className={`${CELL} max-lg:hidden`}>
                                                <CategoryBadge id={schedule.seed.categoryId} />
                                            </Table.Cell>
                                            <Table.Cell className={`${CELL} ${MUTED} truncate max-xl:hidden`}>
                                                {accountName(schedule.seed.accountId)}
                                            </Table.Cell>
                                            <Table.Cell className={`${CELL} ${MUTED} max-md:hidden`}>
                                                {repeat.short(schedule.chain.type, schedule.chain.every)}
                                            </Table.Cell>
                                            <Table.Cell className={`${CELL} ${FIGURE} text-muted-foreground`}>
                                                {schedule.state === "active" && next !== null ? (
                                                    days.day(next, ledger.today)
                                                ) : (
                                                    <HeldBadge state={schedule.state} />
                                                )}
                                            </Table.Cell>
                                            <Table.Cell
                                                align="end"
                                                className={`${CELL} ${FIGURE} text-sm font-medium max-sm:hidden ${schedule.state === "active" ? "" : "text-muted-foreground"}`}
                                            >
                                                {cash.plain(schedule.worth)}
                                            </Table.Cell>
                                            <Table.Cell
                                                align="end"
                                                className={`${CELL} ${FIGURE} text-sm font-medium ${schedule.perMonth > 0 ? "" : "text-muted-foreground"}`}
                                            >
                                                {cash.plain(schedule.perMonth)}
                                            </Table.Cell>
                                            <Table.Cell className={CELL}>
                                                <div className="flex justify-end">
                                                    <ScheduleMenu actions={actions} schedule={schedule} />
                                                </div>
                                            </Table.Cell>
                                        </Table.Row>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </Table.Body>
                </Table>
            )}
            <Foot>
                <span>{copy.all.footer({ active: String(count("active")), paused: String(count("paused")) })}</span>
                <span className="ml-auto">
                    {copy.kpi.perMonth}
                    <span className="dash-figure text-foreground ms-3 font-medium">{cash.plain(perMonth)}</span>
                </span>
            </Foot>
        </>
    );
}
