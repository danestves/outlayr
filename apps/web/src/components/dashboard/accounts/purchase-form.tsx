import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { decimalsFor } from "@outlayr/money/currency";
import { EVERY_ORDER, MAX_INSTALLMENT_COUNT, newInstallmentDraft } from "@outlayr/money/installment-draft";
import type { EveryOption } from "@outlayr/money/installment-draft";
import { installmentAppsIn, installmentRegion } from "@outlayr/money/institution-map";
import type { InstallmentApp } from "@outlayr/money/institution-map";
import { Button } from "panelui-web/button";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Select } from "panelui-web/select";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
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
import { Glyph } from "./glyph";
import { logoIdentity } from "./identity-picker";
import { PhoneAction } from "./parts";

const COUNTS = Array.from({ length: MAX_INSTALLMENT_COUNT }, (_, index) => String(index + 1));
const OTHER_APP = "other";
const CONTENT = "app-shell z-[60]";

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

function ChoiceField<Value extends string>({
    figure = false,
    label,
    onPick,
    options,
    value,
}: {
    figure?: boolean;
    label: ReactNode;
    onPick: (value: Value) => void;
    options: readonly { label: string; value: Value }[];
    value: Value;
}) {
    return (
        <Field>
            <Field.Label>{label}</Field.Label>
            <Select items={options} onValueChange={(next) => next && onPick(next)} value={value}>
                <Select.Trigger>
                    <Select.Value className={figure ? "dash-figure" : undefined} />
                </Select.Trigger>
                <Select.Content className={CONTENT}>
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

/** Nothing to pick yet, so picking one of the region's apps creates it. */
function NoCardsSelect({ onAdd, onOther }: { onAdd: (app: InstallmentApp) => void; onOther: () => void }) {
    const { purchase } = useIntlayer("dashboard-accounts");
    const { locale } = useLocale();
    const region = browserRegion();
    const apps = installmentAppsIn(region);
    const regionName = region && new Intl.DisplayNames([locale], { style: "short", type: "region" }).of(region);
    return (
        <Select
            onValueChange={(next) => {
                const app = apps.find((each) => each.id === next);
                if (app) {
                    onAdd(app);
                } else if (next === OTHER_APP) {
                    onOther();
                }
            }}
            value={null}
        >
            <Select.Trigger>
                <Select.Value placeholder={purchase.pick.value} />
            </Select.Trigger>
            <Select.Content className={CONTENT}>
                {apps.length > 0 ? (
                    <Select.Group>
                        <Select.GroupLabel>{purchase.appsIn({ region: regionName ?? "" })}</Select.GroupLabel>
                        {apps.map((app) => (
                            <Select.Item key={app.id} value={app.id}>
                                {app.label}
                            </Select.Item>
                        ))}
                    </Select.Group>
                ) : null}
                {apps.length > 0 ? <Select.Separator /> : null}
                <Select.Item value={OTHER_APP}>{purchase.other}</Select.Item>
            </Select.Content>
        </Select>
    );
}

function CategoryDot({ color }: { color: string | null | undefined }) {
    return <i className="size-1.5 flex-none rounded-full" style={{ background: color ?? undefined }} />;
}

function CategoryField({ onPick, value }: { onPick: (id: string | null) => void; value: string | null }) {
    const { ledger } = useDashboard();
    const { purchase } = useIntlayer("dashboard-accounts");
    const categories = ledger.books.categories
        .filter((row) => row.deletedAt === null && !row.income && row.parentId === null)
        .toSorted((a, b) => a.sortOrder - b.sortOrder);
    const chosen = categories.find((row) => row.localId === value);
    return (
        <Field>
            <Field.Label>{purchase.category}</Field.Label>
            <Select
                items={categories.map((row) => ({ label: row.name, value: row.localId }))}
                onValueChange={onPick}
                value={value}
            >
                <Select.Trigger>
                    {chosen ? <CategoryDot color={chosen.color} /> : null}
                    <Select.Value placeholder={purchase.pick.value} />
                </Select.Trigger>
                <Select.Content className={CONTENT}>
                    {categories.map((row) => (
                        <Select.Item icon={<CategoryDot color={row.color} />} key={row.localId} value={row.localId}>
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
    onAdd,
    onOther,
    onPick,
    value,
}: {
    error: boolean;
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
        <Field invalid={error}>
            <Field.Label>{purchase.account}</Field.Label>
            {cards.length === 0 ? (
                <NoCardsSelect onAdd={onAdd} onOther={onOther} />
            ) : (
                <Select
                    items={cards.map((row) => ({ label: row.name, value: row.localId }))}
                    onValueChange={onPick}
                    value={value}
                >
                    <Select.Trigger>
                        {chosen ? <AccountTile account={accountLook(chosen)} photos={photos} size="sm" /> : null}
                        <Select.Value placeholder={purchase.pick.value} />
                    </Select.Trigger>
                    <Select.Content className={CONTENT}>
                        {cards.map((row) => (
                            <Select.Item key={row.localId} value={row.localId}>
                                {row.name}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select>
            )}
            {error ? <Field.Error match>{purchase.accountRequired}</Field.Error> : null}
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
            <div className={`rounded-xl border px-3 ${over > 0 ? "border-destructive" : ""}`}>
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
            {over > 0 ? (
                <p className="text-destructive mt-1.5 text-xs" role="alert">
                    {purchase.overPrice({ amount: money(over, currency) })}
                </p>
            ) : null}
            {upfrontTooHigh ? (
                <p className="text-destructive mt-1.5 text-xs" role="alert">
                    {purchase.upfrontTooHigh}
                </p>
            ) : null}
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
    const [saving, setSaving] = useState(false);

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
        if (saving || nameMissing || !account || !plan.schedule || blocked) {
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
        setSaving(true);
        try {
            await commitRows(db, rows);
            onClose();
        } catch {
            setSaving(false);
            setFailed(true);
        }
    };

    return (
        <FlowDialog initialFocus={nameInput} label={purchase.title} onClose={onClose} size="lg">
            <Dialog.Body>
                <form
                    className="flex flex-col gap-4"
                    id={id}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void save();
                    }}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <Field invalid={attempted && nameMissing}>
                            <Field.Label>{purchase.for}</Field.Label>
                            <Input
                                onChange={(event) => setName(event.target.value)}
                                placeholder={purchase.forPlaceholder.value}
                                ref={nameInput}
                                value={name}
                            />
                            {attempted && nameMissing ? <Field.Error match>{purchase.nameRequired}</Field.Error> : null}
                        </Field>
                        <CategoryField onPick={setCategoryId} value={categoryId} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field invalid={attempted && price <= 0}>
                            <Field.Label>{purchase.total}</Field.Label>
                            <AmountInput currency={currency} onText={setTotalText} text={totalText} />
                            {attempted && price <= 0 ? <Field.Error match>{purchase.totalRequired}</Field.Error> : null}
                        </Field>
                        <AccountField
                            error={attempted && !account}
                            onAdd={addApp}
                            onOther={() => onSwitch({ kind: "create", type: "card" })}
                            onPick={setPicked}
                            value={picked}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Field>
                            <Field.Label>{purchase.upfront}</Field.Label>
                            <AmountInput currency={currency} onText={setUpfrontText} text={upfrontText} />
                        </Field>
                        <ChoiceField
                            figure
                            label={purchase.count}
                            onPick={(value) => setCount(Number(value))}
                            options={COUNTS.map((value) => ({ label: value, value }))}
                            value={String(count)}
                        />
                        <Field invalid={plan.over > 0} onBlur={() => eachText?.trim() === "" && setEachText(null)}>
                            <Field.Label>{purchase.each}</Field.Label>
                            <AmountInput
                                currency={currency}
                                // The blur reformat lands here too, and must not make the split amount a typed one.
                                onText={(next) => setEachText(next === splitText ? null : next)}
                                text={eachText ?? splitText}
                            />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ChoiceField
                            label={purchase.every}
                            onPick={setEvery}
                            options={EVERY_ORDER.map((value) => ({ label: everyLabels[value], value }))}
                            value={every}
                        />
                        <Field>
                            <Field.Label>{purchase.firstDue}</Field.Label>
                            <Input
                                className="dash-figure appearance-none"
                                onChange={(event) => setFirstDueKey(event.target.value || null)}
                                type="date"
                                value={dayKey(plan.firstDue)}
                            />
                        </Field>
                    </div>
                    <Summary currency={currency} plan={plan} />
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                {failed ? <span className="text-destructive mr-auto text-[13px]">{flows.saveFailed}</span> : null}
                {failed || blocked ? null : (
                    <PhoneAction className="mr-auto">
                        <Glyph icon={ImageAdd01Icon} size={16} />
                        {purchase.importScreenshot}
                    </PhoneAction>
                )}
                <Button onClick={onClose} variant="outline">
                    {flows.cancel}
                </Button>
                <Button disabled={blocked} form={id} loading={saving} type="submit">
                    {purchase.save}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
