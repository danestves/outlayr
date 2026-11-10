import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
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
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { createdAccount, parseAmount } from "@/lib/account-writes";
import { openAccounts, startOfDay } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { PurchaseSeed } from "@/lib/installment-scan";
import { feeRows, outsidePayment } from "@/lib/installment-writes";
import type { CommitRow } from "@/lib/ledger-committer";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { planPurchase, purchaseInInstallments } from "@/lib/plan-writes";
import type { PurchaseDraft } from "@/lib/plan-writes";

import { AmountInput, amountText, DayField, FlowDialog, focusNode } from "./fields";
import type { AccountFlow } from "./flows";
import { Glyph } from "./glyph";
import { logoIdentity } from "./identity-picker";

const COUNTS = Array.from({ length: MAX_INSTALLMENT_COUNT }, (_, index) => String(index + 1));
const OTHER_APP = "other";
const CONTENT = "app-shell z-[60]";
const CHEVRON = <Glyph icon={ArrowDown01Icon} size={16} />;

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
                <Select.Trigger icon={CHEVRON}>
                    <Select.Value className={figure ? "dash-figure" : undefined} />
                </Select.Trigger>
                <Select.Content alignItemWithTrigger={false} className={CONTENT}>
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
            <Select.Trigger icon={CHEVRON}>
                <Select.Value placeholder={purchase.pick.value} />
            </Select.Trigger>
            <Select.Content alignItemWithTrigger={false} className={CONTENT}>
                {apps.length > 0 ? (
                    <Select.Group>
                        <Select.GroupLabel>{purchase.appsIn({ region: regionName ?? "" })}</Select.GroupLabel>
                        {apps.map((app) => (
                            <Select.Item key={app.id} value={app.id}>
                                <span className="flex w-full items-center justify-between gap-3">
                                    {app.label}
                                    <span className="text-app-tint">{purchase.add}</span>
                                </span>
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
                <Select.Trigger icon={CHEVRON}>
                    {chosen ? <CategoryDot color={chosen.color} /> : null}
                    <Select.Value placeholder={purchase.pick.value} />
                </Select.Trigger>
                <Select.Content alignItemWithTrigger={false} className={CONTENT}>
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
                    <Select.Trigger icon={CHEVRON}>
                        {chosen ? <AccountTile account={accountLook(chosen)} photos={photos} size="sm" /> : null}
                        <Select.Value placeholder={purchase.pick.value} />
                    </Select.Trigger>
                    <Select.Content alignItemWithTrigger={false} className={CONTENT}>
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

function Summary({
    currency,
    plan,
    scanned,
}: {
    currency: string;
    plan: ReturnType<typeof planPurchase>;
    scanned: boolean;
}) {
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
                            {!scanned || ahead.every((row) => row.amount === first.amount)
                                ? purchase.thenEach({ amount: money(first.amount, currency), count: ahead.length })
                                : purchase.thenMixed({ count: ahead.length })}
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
        ledger,
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

function seededFees(
    ledger: Ledger,
    rows: readonly CommitRow[],
    {
        categoryId,
        currency,
        fees,
        note,
        paidBefore,
    }: { categoryId: string | null; currency: string; fees: PurchaseSeed["fees"]; note: string; paidBefore: number }
) {
    const plan = rows.find((row) => row.table === "installmentPlans");
    if (plan?.table !== "installmentPlans") {
        return [];
    }
    const at = Date.now();
    const view = { account: { id: plan.fields.accountId }, categoryId, currency, id: plan.localId };
    return fees.flatMap((fee) => {
        const due = rows.find((row) => row.table === "installments" && row.fields.sequence === fee.sequence);
        if (due?.table !== "installments") {
            return [];
        }
        const date = Math.min(due.fields.dueDate, at);
        const charged = feeRows(ledger, view, due.localId, { amount: fee.amount, date, note }, at);
        return fee.sequence <= paidBefore
            ? [...charged, outsidePayment(ledger.books, view, { amount: fee.amount, date }, crypto.randomUUID(), at)]
            : charged;
    });
}

function startFields(seed: PurchaseSeed | undefined, currency: string) {
    return {
        count: seed?.count ?? newInstallmentDraft(null).count,
        every: seed?.every ?? ("days14" satisfies EveryOption),
        firstDueKey: seed ? dayKey(seed.firstDue) : null,
        totalText: seed ? amountText(seed.price, currency) : "",
        upfrontText: seed?.upfront ? amountText(seed.upfront, currency) : "",
    };
}

function stillScanned(
    seed: PurchaseSeed | undefined,
    form: Pick<PurchaseSeed, "count" | "every" | "price" | "upfront"> & {
        accountId: string | null;
        each: number | null;
        firstDueKey: string | null;
    }
) {
    const same =
        seed !== undefined &&
        seed.accountId === form.accountId &&
        seed.count === form.count &&
        seed.every === form.every &&
        seed.price === form.price &&
        seed.upfront === form.upfront &&
        form.each === null &&
        form.firstDueKey === dayKey(seed.firstDue);
    return same ? seed : null;
}

/** Records a purchase on a card or an installment app. The upfront is paid from outside: no other account moves. */
export function PurchaseForm({
    accountId,
    onClose,
    onSwitch,
    seed,
}: {
    accountId?: string;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
    seed?: PurchaseSeed;
}) {
    const { ledger } = useDashboard();
    const { flows, purchase } = useIntlayer("dashboard-accounts");
    const { fee } = useIntlayer("dashboard-installments");
    const committer = useLedgerCommitter();
    const id = useId();
    const cards = openAccounts(ledger.books).filter((row) => row.kind === "liability");
    const [name, setName] = useState("");
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [start] = useState(() =>
        startFields(seed, cards.find((row) => row.localId === seed?.accountId)?.currency ?? ledger.currency)
    );
    const [totalText, setTotalText] = useState(start.totalText);
    const [picked, setPicked] = useState(seed?.accountId ?? accountId ?? cards[0]?.localId ?? null);
    const [upfrontText, setUpfrontText] = useState(start.upfrontText);
    const [count, setCount] = useState(start.count);
    const [eachText, setEachText] = useState<string | null>(null);
    const [every, setEvery] = useState<EveryOption>(start.every);
    const [firstDueKey, setFirstDueKey] = useState<string | null>(start.firstDueKey);
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
    const upfront = parseAmount(upfrontText, decimals);
    const each = eachText?.trim() ? parseAmount(eachText, decimals) : null;
    const scanned = stillScanned(seed, { accountId: picked, count, each, every, firstDueKey, price, upfront });
    const plan = planPurchase({
        count,
        currency,
        each,
        edits: scanned?.edits,
        every,
        firstDue: firstDueKey === null ? null : fromKey(firstDueKey),
        now: new Date(ledger.now),
        paidBefore: scanned?.paidBefore ?? null,
        price,
        purchaseDay: scanned?.purchaseDay ?? null,
        upfront,
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
        if (!(await committer.commit([row]))) {
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
            purchasedOn: plan.purchasedOn,
            schedule: plan.schedule,
        });
        const fees = scanned
            ? seededFees(ledger, rows, {
                  categoryId,
                  currency,
                  fees: scanned.fees,
                  note: fee.note({ order: name.trim() }).value,
                  paidBefore: plan.paidBefore,
              })
            : [];
        setSaving(true);
        if (await committer.commit([...rows, ...fees])) {
            onClose();
        } else {
            setSaving(false);
            setFailed(true);
        }
    };

    return (
        <FlowDialog label={purchase.title}>
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
                                ref={focusNode}
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
                            <DayField
                                day={dayKey(plan.firstDue)}
                                label={purchase.firstDue.value}
                                onDay={setFirstDueKey}
                                trailing
                            />
                        </Field>
                    </div>
                    <Summary currency={currency} plan={plan} scanned={scanned !== null} />
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                {failed ? (
                    <span className="text-destructive flex items-center text-[13px]">{flows.saveFailed}</span>
                ) : null}
                {failed || blocked ? null : (
                    <Button
                        className="min-w-max!"
                        onClick={() => onSwitch({ accountId: picked ?? undefined, kind: "scan" })}
                        variant="secondary"
                    >
                        <Glyph icon={ImageAdd01Icon} size={16} />
                        {purchase.importScreenshot}
                    </Button>
                )}
                <Button onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button disabled={blocked} form={id} loading={saving} type="submit">
                    {purchase.save}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
