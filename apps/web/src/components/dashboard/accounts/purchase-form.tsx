import { Popover } from "@base-ui/react/popover";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { decimalsFor } from "@outlayr/money/currency";
import { EVERY_ORDER, MAX_INSTALLMENT_COUNT, newInstallmentDraft } from "@outlayr/money/installment-draft";
import type { EveryOption } from "@outlayr/money/installment-draft";
import { installmentAppsIn, installmentRegion } from "@outlayr/money/institution-map";
import type { InstallmentApp } from "@outlayr/money/institution-map";
import { RiArrowDownSLine, RiCalendarLine, RiImageAddLine } from "@remixicon/react";
import { Select } from "panelui-web/select";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { PhoneButton } from "@/components/dashboard/home/setup";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { createdAccount, parseAmount } from "@/lib/account-writes";
import { openAccounts, startOfDay } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { commitRows } from "@/lib/ledger-commit";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { planPurchase, purchaseInInstallments } from "@/lib/plan-writes";
import type { PurchaseDraft } from "@/lib/plan-writes";

import { AmountInput, amountText, FlowDialog } from "./fields";
import { useLedgerDb } from "./flows";
import type { AccountFlow } from "./flows";
import { logoIdentity } from "./identity-picker";

const COUNTS = Array.from({ length: MAX_INSTALLMENT_COUNT }, (_, index) => String(index + 1));

const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key: string) => {
    const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
};

function browserRegion() {
    try {
        return installmentRegion(new Intl.Locale(navigator.language).region);
    } catch {
        return null;
    }
}

function Field({ children, htmlFor, label }: { children: ReactNode; htmlFor: string; label: ReactNode }) {
    return (
        <div>
            <label className="dash-lb" htmlFor={htmlFor}>
                {label}
            </label>
            {children}
        </div>
    );
}

function ChoiceField<Value extends string>({
    className = "",
    id,
    label,
    onPick,
    options,
    value,
}: {
    className?: string;
    id: string;
    label: ReactNode;
    onPick: (value: Value) => void;
    options: readonly { label: string; value: Value }[];
    value: Value;
}) {
    return (
        <Field htmlFor={id} label={label}>
            <Select items={options} onValueChange={(next) => next && onPick(next)} value={value}>
                <Select.Trigger className={`dash-fi ${className}`} icon={<RiArrowDownSLine size={16} />} id={id}>
                    <Select.Value />
                </Select.Trigger>
                <Select.Content className="app-shell z-[60]">
                    {options.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                            {option.label}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Field>
    );
}

function NoCardsField({
    id,
    onAdd,
    onOther,
}: {
    id: string;
    onAdd: (app: InstallmentApp) => void;
    onOther: () => void;
}) {
    const { purchase } = useIntlayer("dashboard-accounts");
    const { locale } = useLocale();
    const [open, setOpen] = useState(false);
    const region = browserRegion();
    const apps = installmentAppsIn(region);
    const regionName = region && new Intl.DisplayNames([locale], { style: "short", type: "region" }).of(region);
    return (
        <Popover.Root onOpenChange={setOpen} open={open}>
            <Popover.Trigger className="dash-fi" id={id} type="button">
                <span className="text-muted-foreground">{purchase.pick}</span>
                <RiArrowDownSLine className="text-muted-foreground ml-auto flex-none" size={16} />
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Positioner align="start" className="z-[60]" sideOffset={6}>
                    <Popover.Popup className="app-shell dash-po ph-no-capture w-[232px]">
                        {apps.length > 0 ? (
                            <div className="text-muted-foreground px-2 pt-1 pb-1.5 text-xs leading-4">
                                {purchase.appsIn({ region: regionName ?? "" })}
                            </div>
                        ) : null}
                        {apps.map((app) => (
                            <button
                                className="dash-pr"
                                key={app.id}
                                onClick={() => {
                                    onAdd(app);
                                    setOpen(false);
                                }}
                                type="button"
                            >
                                <span className="truncate">{app.label}</span>
                                <span className="text-app-tint ml-auto">{purchase.add}</span>
                            </button>
                        ))}
                        {apps.length > 0 ? <div className="dash-menu-rule" /> : null}
                        <button className="dash-pr" onClick={onOther} type="button">
                            {purchase.other}
                        </button>
                    </Popover.Popup>
                </Popover.Positioner>
            </Popover.Portal>
        </Popover.Root>
    );
}

function CategoryField({
    id,
    onPick,
    value,
}: {
    id: string;
    onPick: (id: string | null) => void;
    value: string | null;
}) {
    const { ledger } = useDashboard();
    const { purchase } = useIntlayer("dashboard-accounts");
    const categories = ledger.books.categories
        .filter((row) => row.deletedAt === null && !row.income && row.parentId === null)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);
    const chosen = categories.find((row) => row.localId === value);
    return (
        <Field htmlFor={id} label={purchase.category}>
            <Select onValueChange={onPick} value={value}>
                <Select.Trigger className="dash-fi" icon={<RiArrowDownSLine size={16} />} id={id}>
                    {chosen ? (
                        <span className="flex min-w-0 items-center gap-2">
                            <i
                                className="size-1.5 flex-none rounded-full"
                                style={{ background: chosen.color ?? undefined }}
                            />
                            <span className="truncate">{chosen.name}</span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{purchase.pick}</span>
                    )}
                </Select.Trigger>
                <Select.Content className="app-shell z-[60]">
                    {categories.map((row) => (
                        <Select.Item key={row.localId} value={row.localId}>
                            {row.name}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Field>
    );
}

function AccountField({
    error,
    id,
    onAdd,
    onOther,
    onPick,
    value,
}: {
    error: boolean;
    id: string;
    onAdd: (app: InstallmentApp) => void;
    onOther: () => void;
    onPick: (id: string | null) => void;
    value: string | null;
}) {
    const { ledger, photos } = useDashboard();
    const { purchase } = useIntlayer("dashboard-accounts");
    const cards = openAccounts(ledger.books).filter((row) => row.kind === "liability");
    const chosen = cards.find((row) => row.localId === value);
    return (
        <Field htmlFor={id} label={purchase.account}>
            {cards.length === 0 ? (
                <NoCardsField id={id} onAdd={onAdd} onOther={onOther} />
            ) : (
                <Select onValueChange={onPick} value={value}>
                    <Select.Trigger className="dash-fi" icon={<RiArrowDownSLine size={16} />} id={id}>
                        {chosen ? (
                            <span className="flex min-w-0 items-center gap-2">
                                <AccountTile account={accountLook(chosen)} photos={photos} size="sm" />
                                <span className="truncate">{chosen.name}</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground">{purchase.pick}</span>
                        )}
                    </Select.Trigger>
                    <Select.Content className="app-shell z-[60]">
                        {cards.map((row) => (
                            <Select.Item key={row.localId} value={row.localId}>
                                {row.name}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select>
            )}
            {error ? <p className="dash-er">{purchase.accountRequired}</p> : null}
        </Field>
    );
}

function FirstDueField({ day, id, onPick }: { day: string; id: string; onPick: (day: string | null) => void }) {
    const { purchase } = useIntlayer("dashboard-accounts");
    const date = useDateFormat();
    const input = useRef<HTMLInputElement>(null);
    return (
        <Field htmlFor={id} label={purchase.firstDue}>
            <div className="dash-fi relative">
                <span className="dash-figure">{date.full(day)}</span>
                <RiCalendarLine className="text-muted-foreground ml-auto flex-none" size={16} />
                <input
                    className="absolute inset-0 opacity-0"
                    id={id}
                    onChange={(event) => onPick(event.target.value || null)}
                    onClick={() => input.current?.showPicker()}
                    ref={input}
                    type="date"
                    value={day}
                />
            </div>
        </Field>
    );
}

const SUMMARY_ROW = "flex h-[33px] items-center text-[13px]";

function Summary({ currency, plan }: { currency: string; plan: ReturnType<typeof planPurchase> }) {
    const { purchase } = useIntlayer("dashboard-accounts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { ahead, over, paidNow, total, upfrontTooHigh } = plan;
    const [first] = ahead;
    const last = ahead.at(-1);
    const dates = () => {
        if (!first || !last) {
            return null;
        }
        const from = date.day(dayKey(first.dueDate));
        return first === last ? from : purchase.range({ from, to: date.day(dayKey(last.dueDate)) });
    };
    return (
        <div>
            <div className={`rounded-xl border px-3 ${over > 0 ? "border-app-spend" : ""}`}>
                <div className={`${SUMMARY_ROW} border-b`}>
                    <span className="text-muted-foreground">{purchase.paidNow}</span>
                    <span className="dash-figure ml-auto">{money(paidNow, currency)}</span>
                </div>
                {first ? (
                    <div className={`${SUMMARY_ROW} border-b`}>
                        <span className="text-muted-foreground">
                            {purchase.thenEach({ amount: money(first.amount, currency), count: ahead.length })}
                        </span>
                        <span className="dash-figure ml-auto">
                            {over > 0 ? money(total - paidNow, currency) : dates()}
                        </span>
                    </div>
                ) : null}
                <div className={SUMMARY_ROW}>
                    <span className="text-muted-foreground">{purchase.total}</span>
                    <span className="dash-figure ml-auto">{money(total, currency)}</span>
                </div>
            </div>
            {over > 0 ? <p className="dash-er">{purchase.overPrice({ amount: money(over, currency) })}</p> : null}
            {upfrontTooHigh ? <p className="dash-er">{purchase.upfrontTooHigh}</p> : null}
        </div>
    );
}

function purchaseRows(
    ledger: Ledger,
    {
        categoryId,
        purchasedOn,
        schedule,
        ...draft
    }: Omit<PurchaseDraft, "categoryName" | "purchasedAt"> & { purchasedOn: Date | null }
) {
    const at = Date.now();
    return purchaseInInstallments(
        ledger.books,
        {
            ...draft,
            categoryId,
            categoryName: ledger.books.categories.find((row) => row.localId === categoryId)?.name ?? null,
            purchasedAt: purchasedOn ? startOfDay(ledger, dayKey(purchasedOn)) : at,
            // Due days are walls in the ledger's zone, which the browser's may not share.
            schedule: schedule.map((row) => ({ ...row, dueDate: new Date(startOfDay(ledger, dayKey(row.dueDate))) })),
        },
        () => crypto.randomUUID(),
        at
    );
}

/** Records a purchase on a card or an installment app. The upfront is paid from outside: no other account moves. */
export function PurchaseForm({
    accountId,
    onClose,
    onSwitch,
}: {
    accountId?: string;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { ledger } = useDashboard();
    const { flows, purchase } = useIntlayer("dashboard-accounts");
    const db = useLedgerDb();
    const id = useId();
    const nameInput = useRef<HTMLInputElement>(null);
    const cards = openAccounts(ledger.books).filter((row) => row.kind === "liability");
    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [totalText, setTotalText] = useState("");
    const [picked, setPicked] = useState(accountId ?? cards[0]?.localId ?? null);
    const [upfrontText, setUpfrontText] = useState("");
    const [count, setCount] = useState(newInstallmentDraft(null).count);
    const [eachText, setEachText] = useState<string | null>(null);
    const [every, setEvery] = useState<EveryOption>("days14");
    const [firstDueKey, setFirstDueKey] = useState<string | null>(null);
    const [attempted, setAttempted] = useState(false);
    const [failed, setFailed] = useState(false);

    const everyLabels: Record<EveryOption, string> = {
        days14: purchase.everyDays14.value,
        days15: purchase.everyDays15.value,
        fifteenthAndLast: purchase.everyFifteenthAndLast.value,
        firstAndSixteenth: purchase.everyFirstAndSixteenth.value,
        monthly: purchase.everyMonthly.value,
        weekly: purchase.everyWeekly.value,
    };
    const account = cards.find((row) => row.localId === picked) ?? null;
    const currency = account?.currency ?? ledger.currency;
    const decimals = decimalsFor(currency);
    const price = parseAmount(totalText, decimals);
    const plan = planPurchase({
        count,
        currency,
        each: eachText?.trim() ? parseAmount(eachText, decimals) : null,
        every,
        firstDue: firstDueKey === null ? null : fromKey(firstDueKey),
        now: new Date(ledger.now),
        price,
        upfront: parseAmount(upfrontText, decimals),
    });
    const splitText = plan.split === null ? "" : amountText(plan.split, currency);
    const blocked = plan.over > 0 || plan.upfrontTooHigh;
    const nameMissing = name.trim() === "";

    const addApp = async (app: InstallmentApp) => {
        const row = createdAccount(
            ledger.books,
            {
                creditLimit: null,
                currency: app.currency,
                customColor: null,
                emoji: null,
                icon: null,
                imageColor: null,
                imageKey: logoIdentity(app.domain).imageKey,
                kind: "liability",
                name: app.label,
                paymentDay: null,
                statementDay: null,
            },
            0,
            crypto.randomUUID(),
            Date.now()
        );
        setPicked(row.localId);
        try {
            await commitRows(db, [row]);
        } catch {
            setPicked(null);
            setFailed(true);
        }
    };

    const save = async () => {
        setAttempted(true);
        setFailed(false);
        if (nameMissing || !account || !plan.schedule || blocked) {
            return;
        }
        const rows = purchaseRows(ledger, {
            accountId: account.localId,
            categoryId,
            currency,
            name: name.trim(),
            paidBefore: plan.paidBefore,
            price,
            purchasedOn: plan.backdated ? plan.firstDue : null,
            schedule: plan.schedule,
        });
        try {
            await commitRows(db, rows);
            onClose();
        } catch {
            setFailed(true);
        }
    };

    return (
        <FlowDialog initialFocus={nameInput} label={purchase.title} onClose={onClose} wide>
            <form
                className="flex min-h-0 flex-col"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <div className="dash-db flex flex-col gap-3.5">
                    <div className="grid grid-cols-2 gap-3">
                        <Field htmlFor={`${id}-name`} label={purchase.for}>
                            <div className="dash-fi" data-invalid={attempted && nameMissing ? "true" : undefined}>
                                <input
                                    id={`${id}-name`}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder={purchase.forPlaceholder.value}
                                    ref={nameInput}
                                    value={name}
                                />
                            </div>
                            {attempted && nameMissing ? <p className="dash-er">{purchase.nameRequired}</p> : null}
                        </Field>
                        <CategoryField id={`${id}-category`} onPick={setCategoryId} value={categoryId} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field htmlFor={`${id}-total`} label={purchase.total}>
                            <AmountInput
                                currency={currency}
                                id={`${id}-total`}
                                invalid={attempted && price <= 0}
                                onText={setTotalText}
                                text={totalText}
                            />
                            {attempted && price <= 0 ? <p className="dash-er">{purchase.totalRequired}</p> : null}
                        </Field>
                        <AccountField
                            error={attempted && !account}
                            id={`${id}-account`}
                            onAdd={addApp}
                            onOther={() => onSwitch({ kind: "create", type: "card" })}
                            onPick={setPicked}
                            value={picked}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Field htmlFor={`${id}-upfront`} label={purchase.upfront}>
                            <AmountInput
                                currency={currency}
                                id={`${id}-upfront`}
                                onText={setUpfrontText}
                                text={upfrontText}
                            />
                        </Field>
                        <ChoiceField
                            className="dash-figure"
                            id={`${id}-count`}
                            label={purchase.count}
                            onPick={(value) => setCount(Number(value))}
                            options={COUNTS.map((value) => ({ label: value, value }))}
                            value={String(count)}
                        />
                        <div onBlur={() => eachText?.trim() === "" && setEachText(null)}>
                            <Field htmlFor={`${id}-each`} label={purchase.each}>
                                <AmountInput
                                    currency={currency}
                                    id={`${id}-each`}
                                    invalid={plan.over > 0}
                                    // The blur reformat lands here too, and must not make the split amount a typed one.
                                    onText={(next) => setEachText(next === splitText ? null : next)}
                                    text={eachText ?? splitText}
                                />
                            </Field>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ChoiceField
                            id={`${id}-every`}
                            label={purchase.every}
                            onPick={setEvery}
                            options={EVERY_ORDER.map((value) => ({ label: everyLabels[value], value }))}
                            value={every}
                        />
                        <FirstDueField day={dayKey(plan.firstDue)} id={`${id}-first`} onPick={setFirstDueKey} />
                    </div>
                    <Summary currency={currency} plan={plan} />
                </div>
                <div className="dash-df">
                    {failed ? <span className="text-app-spend mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                    {failed || blocked ? null : (
                        <PhoneButton className="dash-ob mr-auto">
                            <RiImageAddLine size={16} />
                            {purchase.importScreenshot}
                        </PhoneButton>
                    )}
                    <button className="dash-ob" onClick={onClose} type="button">
                        {flows.cancel}
                    </button>
                    <button className={`dash-btn ${blocked ? "opacity-50" : ""}`} disabled={blocked} type="submit">
                        {purchase.save}
                    </button>
                </div>
            </form>
        </FlowDialog>
    );
}
