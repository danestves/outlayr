import PlusSignIcon from "@hugeicons/core-free-icons/PlusSignIcon";
import StarIcon from "@hugeicons/core-free-icons/StarIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { currencyDisplayFor } from "@outlayr/money/currency";
import {
    FAVOURITE_CURRENCY_LIMIT,
    isFavourite,
    parseFavourites,
    serialiseFavourites,
    toggleFavourite,
} from "@outlayr/money/favourite-currencies";
import { Button } from "panelui-web/button";
import { Command } from "panelui-web/command";
import { Dialog } from "panelui-web/dialog";
import { Table } from "panelui-web/table";
import { useContext, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useIntlayer } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { LedgerSettingsContext, useDisplayFormat, useMeta } from "@/lib/ledger-settings";

import { crossRate, formatRate, usdRates } from "./currency-rates";
import { Row, SectionHead, SettingsCard, useSaveSettings } from "./parts";

const SAMPLE_AMOUNT = 1284;

export function Currency() {
    const copy = useIntlayer("dashboard-settings");
    const { currency } = useContext(LedgerSettingsContext);
    const { money } = useDisplayFormat();
    const { overview, ledger } = useDashboard();
    const { accounts, net } = overview.balances;
    const { currency: text } = copy;
    const main = currencyDisplayFor(currency);
    return (
        <>
            <SectionHead title={copy.sections.currency} />
            <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-4">
                    <SettingsCard title={text.main}>
                        <Row
                            hint={main.name}
                            label={currency}
                            leading={
                                <span className="bg-app-fill text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-medium">
                                    {main.symbol}
                                </span>
                            }
                        >
                            <MainPicker current={currency} />
                        </Row>
                        <Row label={text.format}>
                            <span className="font-mono text-sm tabular-nums">{money(SAMPLE_AMOUNT, currency)}</span>
                        </Row>
                        <Row hint={text.totalsHint} label={text.totals} />
                    </SettingsCard>
                    <SettingsCard
                        action={
                            <span className="text-muted-foreground font-mono text-[13px]">{money(net, currency)}</span>
                        }
                        title={text.byCurrency}
                    >
                        {accounts.length === 0 ? (
                            <p className="text-muted-foreground px-4 py-4 text-sm">{text.noAccounts}</p>
                        ) : (
                            <Table framed aria-label={text.byCurrency.value} maxHeight="none">
                                <Table.Header className="in-data-[sticky]:bg-card">
                                    <Table.Row>
                                        <Table.Head>{text.account}</Table.Head>
                                        <Table.Head>{text.currencyColumn}</Table.Head>
                                        <Table.Head align="end">{text.balance}</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {accounts.map((account, index) => (
                                        <Table.Row key={`${account.name}-${index}`}>
                                            <Table.Cell className="max-w-[200px]">
                                                <span className="flex min-w-0 items-center gap-2.5 font-medium">
                                                    <AccountTile account={account.look} />
                                                    <span className="truncate">{account.name}</span>
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell className="dash-figure text-muted-foreground">
                                                {account.currency}
                                            </Table.Cell>
                                            <Table.Cell align="end" className="dash-figure">
                                                {money(account.balance, account.currency)}
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        )}
                    </SettingsCard>
                </div>
                <Favourites books={ledger.books.exchangeRates} currency={currency} />
            </div>
        </>
    );
}

function Favourites({ books, currency }: { books: Parameters<typeof usdRates>[0]; currency: string }) {
    const { currency: text } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const save = useSaveSettings();
    const date = useDateFormat();
    const favourites = parseFavourites(meta.get("favouriteCurrencies") ?? null).filter((code) => code !== currency);
    const stored = parseFavourites(meta.get("favouriteCurrencies") ?? null);
    const { latest, rate } = useMemo(() => usdRates(books), [books]);
    const toggle = (code: string) => save({ favouriteCurrencies: serialiseFavourites(toggleFavourite(stored, code)) });
    return (
        <SettingsCard
            action={
                latest ? (
                    <span className="text-muted-foreground font-mono text-[13px]">
                        {text.rateDate({ date: date.day(latest) })}
                    </span>
                ) : undefined
            }
            footer={
                <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-muted-foreground text-[13px]">{text.starHint}</span>
                    <CurrencyPicker
                        action={(code) => text.addCode({ code }).value}
                        initial={null}
                        label={text.favourites.value}
                        onPick={(code) => {
                            if (!isFavourite(stored, code)) {
                                toggle(code);
                            }
                        }}
                        trigger={
                            <Button disabled={stored.length >= FAVOURITE_CURRENCY_LIMIT} size="sm" variant="outline">
                                <HugeiconsIcon icon={PlusSignIcon} size={16} />
                                {text.add}
                            </Button>
                        }
                    />
                </div>
            }
            title={text.favourites}
        >
            <Table framed aria-label={text.favourites.value} maxHeight="none">
                <Table.Header className="in-data-[sticky]:bg-card">
                    <Table.Row>
                        <Table.Head>{text.code}</Table.Head>
                        <Table.Head>{text.name}</Table.Head>
                        <Table.Head align="end">1 {currency}</Table.Head>
                        <Table.Head className="w-10" />
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {favourites.map((code) => {
                        const value = crossRate(rate, currency, code);
                        return (
                            <Table.Row key={code}>
                                <Table.Cell className="dash-figure font-medium">{code}</Table.Cell>
                                <Table.Cell className="text-muted-foreground">
                                    {currencyDisplayFor(code).name}
                                </Table.Cell>
                                <Table.Cell align="end" className="dash-figure">
                                    {value === null ? "-" : formatRate(value)}
                                </Table.Cell>
                                <Table.Cell align="end">
                                    <Button
                                        aria-label={text.toggleFavourite({ code }).value}
                                        aria-pressed
                                        onClick={() => toggle(code)}
                                        size="icon-sm"
                                        variant="ghost"
                                    >
                                        <HugeiconsIcon className="text-primary" icon={StarIcon} size={16} />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table>
        </SettingsCard>
    );
}

function MainPicker({ current }: { current: string }) {
    const { currency: text } = useIntlayer("dashboard-settings");
    const save = useSaveSettings();
    return (
        <CurrencyPicker
            action={(code) => text.use({ code }).value}
            initial={current}
            label={text.main.value}
            onPick={(code) => save({ currency: code, currencyChosen: "true" })}
            trigger={
                <Button size="sm" variant="outline">
                    {text.change}
                </Button>
            }
        />
    );
}

function CurrencyPicker({
    action,
    initial,
    label,
    onPick,
    trigger,
}: {
    action: (code: string) => string;
    initial: string | null;
    label: string;
    onPick: (code: string) => void;
    trigger: ReactElement;
}) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog onOpenChange={setOpen} open={open}>
            <Dialog.Trigger render={trigger} />
            <Dialog.Content className="app-shell">
                <Dialog.Header>
                    <Dialog.Title>{label}</Dialog.Title>
                </Dialog.Header>
                <PickerBody
                    action={action}
                    initial={initial}
                    label={label}
                    onDone={(code) => {
                        onPick(code);
                        setOpen(false);
                    }}
                />
            </Dialog.Content>
        </Dialog>
    );
}

function PickerBody({
    action,
    initial,
    label,
    onDone,
}: {
    action: (code: string) => string;
    initial: string | null;
    label: string;
    onDone: (code: string) => void;
}) {
    const { account, currency: text } = useIntlayer("dashboard-settings");
    const meta = useMeta();
    const save = useSaveSettings();
    const stored = parseFavourites(meta.get("favouriteCurrencies") ?? null);
    const full = stored.length >= FAVOURITE_CURRENCY_LIMIT;
    // Rows stay in their group until the dialog reopens, so starring one doesn't pull it out from under the pointer.
    const [favourites] = useState(stored);
    const [picked, setPicked] = useState(initial);
    const row = (code: string) => {
        const starred = isFavourite(stored, code);
        return (
            <Command.Item
                aria-current={picked === code}
                className="aria-current:bg-app-fill"
                closeOnSelect={false}
                keywords={[currencyDisplayFor(code).name]}
                key={code}
                kind={
                    <Button
                        aria-label={text.toggleFavourite({ code }).value}
                        aria-pressed={starred}
                        disabled={full && !starred}
                        onClick={(event) => {
                            event.stopPropagation();
                            save({ favouriteCurrencies: serialiseFavourites(toggleFavourite(stored, code)) });
                        }}
                        size="icon-sm"
                        variant="ghost"
                    >
                        <HugeiconsIcon className={starred ? "text-primary" : undefined} icon={StarIcon} size={16} />
                    </Button>
                }
                onSelect={() => setPicked(code)}
                textValue={`${code} ${currencyDisplayFor(code).name}`}
                value={code}
            >
                <span className="flex items-center gap-3">
                    <span className="dash-figure w-9 font-medium">{code}</span>
                    <span className="text-muted-foreground">{currencyDisplayFor(code).name}</span>
                </span>
            </Command.Item>
        );
    };
    return (
        <>
            <Dialog.Body>
                <Command className="-mx-2 w-auto border-0 bg-transparent shadow-none" label={label} variant="compact">
                    <Command.Input autoFocus className="max-sm:text-base" placeholder={text.search.value} />
                    <Command.List className="max-h-80 flex-none overflow-y-auto">
                        <Command.Empty>{text.none}</Command.Empty>
                        {favourites.length > 0 ? (
                            <Command.Group
                                heading={
                                    <span className="flex justify-between">
                                        {text.favourites}
                                        <span className="font-mono">
                                            {text.favouritesCount({
                                                count: stored.length,
                                                limit: FAVOURITE_CURRENCY_LIMIT,
                                            })}
                                        </span>
                                    </span>
                                }
                            >
                                {favourites.map(row)}
                            </Command.Group>
                        ) : null}
                        <Command.Group
                            heading={
                                <span className="flex justify-between">
                                    {text.all}
                                    {full ? (
                                        <span className="font-mono">
                                            {text.favouritesFull({ limit: FAVOURITE_CURRENCY_LIMIT })}
                                        </span>
                                    ) : null}
                                </span>
                            }
                        >
                            {PICKABLE_CURRENCY_CODES.filter((code) => !favourites.includes(code)).map(row)}
                        </Command.Group>
                    </Command.List>
                </Command>
            </Dialog.Body>
            <Dialog.Footer>
                <Dialog.Close render={<Button variant="secondary" />}>{account.cancel}</Dialog.Close>
                <Button disabled={picked === null} onClick={() => picked && onDone(picked)}>
                    {picked === null ? label : action(picked)}
                </Button>
            </Dialog.Footer>
        </>
    );
}
