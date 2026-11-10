import Archive02Icon from "@hugeicons/core-free-icons/Archive02Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import BankIcon from "@hugeicons/core-free-icons/BankIcon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Wallet01Icon from "@hugeicons/core-free-icons/Wallet01Icon";
import { toAccountKind } from "@outlayr/money/account-kind";
import { decimalsFor } from "@outlayr/money/currency";
import { resolveInstitutionDomain } from "@outlayr/money/institution-map";
import { merchantKey } from "@outlayr/money/merchant-key";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "panelui-web/button";
import { ChoiceCards } from "panelui-web/choice-cards";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Label } from "panelui-web/label";
import { Select } from "panelui-web/select";
import { Switch } from "panelui-web/switch";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { createdAccount, editedAccount, parseAmount } from "@/lib/account-writes";
import type { LedgerBooks } from "@/lib/ledger-books";

import { AmountInput, amountText, CurrencyField, FlowDialog, focusNode } from "./fields";
import type { AccountFlow, AccountType } from "./flows";
import { Glyph } from "./glyph";
import { IdentityPicker, logoIdentity, logoUrl } from "./identity-picker";
import type { Identity } from "./identity-picker";
import { accountFacts } from "./model";

type Account = LedgerBooks["accounts"][number];

const DEFAULT_ICON: Record<AccountType, string> = { bank: "Bank", card: "CreditCard", cash: "Wallet01" };
const DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1));
const DEFAULT_STATEMENT = 25;
const DEFAULT_PAYMENT = 20;
const TYPE_ITEM =
    "border-border bg-foreground/[0.024] hover:bg-muted/60 data-checked:border-primary data-checked:bg-[color-mix(in_oklab,var(--primary)_14%,var(--card))] h-11 flex-row items-center gap-2 rounded-[10px] border px-3 py-0 data-checked:outline-none [&>[data-slot=choice-cards-check]]:hidden [&>[data-slot=choice-cards-text]]:min-w-0 [&>[data-slot=choice-cards-text]]:p-0";
const TYPE_MEDIA =
    "text-muted-foreground group-data-checked/choice:text-primary aspect-auto w-auto flex-none rounded-none bg-transparent ring-0 group-data-checked/choice:[&>*]:scale-100 dark:bg-transparent";

const blankIdentity = (type: AccountType): Identity => ({
    color: null,
    emoji: null,
    icon: DEFAULT_ICON[type],
    imageKey: null,
    preview: null,
});

const identityOf = (account: Account): Identity => {
    const domain = account.imageKey?.startsWith("merchants/") ? account.imageKey.slice("merchants/".length) : null;
    return {
        color: account.customColor,
        emoji: account.emoji,
        icon: account.icon,
        imageKey: account.imageKey,
        preview: domain === null ? null : logoUrl(domain),
    };
};

const logoFor = (name: string) => {
    const domain = resolveInstitutionDomain(merchantKey(name));
    return domain === null ? null : logoIdentity(domain);
};

function DayField({ label, onChange, value }: { label: ReactNode; onChange: (day: number) => void; value: number }) {
    const { flows } = useIntlayer("dashboard-accounts");
    return (
        <Field>
            <Field.Label>{label}</Field.Label>
            <Select
                items={DAYS.map((day) => ({ label: flows.day({ day }).value, value: day }))}
                onValueChange={(day) => day && onChange(Number(day))}
                value={String(value)}
            >
                <Select.Trigger icon={<Glyph icon={ArrowDown01Icon} size={16} />}>
                    <Select.Value className="dash-figure" />
                </Select.Trigger>
                <Select.Content className="app-shell z-[60]">
                    {DAYS.map((day) => (
                        <Select.Item key={day} value={day}>
                            {flows.day({ day })}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </Field>
    );
}

// Wider than an equal share when the row is full, and the padding the frames give a footer pill.
const FOOTER_PILL = "min-w-max! px-3.5";

function startValues(account: Account | null, type: AccountType, balance: number, mainCurrency: string) {
    const currency = account?.currency ?? mainCurrency;
    const liability = account ? toAccountKind(account.kind) === "liability" : type === "card";
    return {
        balanceText: account ? amountText(Math.abs(balance), currency) : "",
        currency,
        identity: account ? identityOf(account) : blankIdentity(type),
        identityByHand: account ? Boolean(account.imageKey || account.emoji || account.icon) : false,
        limitText: account?.creditLimit ? amountText(account.creditLimit, currency) : "",
        liability,
        name: account?.name ?? "",
        negative: balance < 0 || (balance === 0 && liability),
        paymentDay: account?.paymentDay ?? DEFAULT_PAYMENT,
        statementDay: account?.statementDay ?? DEFAULT_STATEMENT,
        type,
    };
}

function accountDraft(
    value: {
        currency: string;
        identity: Identity;
        liability: boolean;
        name: string;
        paymentDay: number;
        statementDay: number;
    },
    limit: number
) {
    return {
        creditLimit: value.liability && limit > 0 ? limit : null,
        currency: value.currency,
        customColor: value.identity.color,
        emoji: value.identity.emoji,
        icon: value.identity.icon,
        imageColor: null,
        imageKey: value.identity.imageKey,
        kind: value.liability ? ("liability" as const) : ("asset" as const),
        name: value.name.trim(),
        paymentDay: value.liability ? value.paymentDay : null,
        statementDay: value.liability ? value.statementDay : null,
    };
}

function TypePicker({ onPick, value }: { onPick: (type: AccountType) => void; value: AccountType }) {
    const { flows } = useIntlayer("dashboard-accounts");
    const types = [
        { icon: BankIcon, label: flows.bank, type: "bank" },
        { icon: Wallet01Icon, label: flows.cash, type: "cash" },
        { icon: CreditCardIcon, label: flows.cardOrLoan, type: "card" },
    ] as const;
    return (
        <ChoiceCards
            aria-label={flows.accountType.value}
            onValueChange={(next) => {
                const picked = types.find((each) => each.type === next);
                if (picked) {
                    onPick(picked.type);
                }
            }}
            value={value}
        >
            {types.map(({ icon, label, type }) => (
                <ChoiceCards.Item className={TYPE_ITEM} key={type} value={type}>
                    <ChoiceCards.Media className={TYPE_MEDIA}>
                        <Glyph icon={icon} size={17} />
                    </ChoiceCards.Media>
                    <ChoiceCards.Label className="text-foreground group-data-checked/choice:text-foreground">
                        {label}
                    </ChoiceCards.Label>
                </ChoiceCards.Item>
            ))}
        </ChoiceCards>
    );
}

function EditActions({ accountId, onSwitch }: { accountId: string; onSwitch: (flow: AccountFlow) => void }) {
    const { actions, flows } = useIntlayer("dashboard-accounts");
    return (
        <>
            <Button
                className={FOOTER_PILL}
                onClick={() => onSwitch({ accountId, kind: "archive" })}
                variant="secondary"
            >
                <Glyph icon={Archive02Icon} className="text-muted-foreground" size={16} />
                {flows.archive}
            </Button>
            <Button
                className={`text-destructive ${FOOTER_PILL}`}
                onClick={() => onSwitch({ accountId, kind: "delete" })}
                variant="secondary"
            >
                <Glyph icon={Delete02Icon} size={16} />
                {actions.delete}
            </Button>
        </>
    );
}

/** Create and edit. Picking an identity by hand stops the name from replacing it with a matched logo. */
export function AccountForm({
    account,
    onClose,
    onSwitch,
    type: startType,
}: {
    account: Account | null;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
    type: AccountType;
}) {
    const { ledger, overview, photos } = useDashboard();
    const committer = useLedgerCommitter();
    const { flows } = useIntlayer("dashboard-accounts");
    const { locale } = useLocale();
    const id = useId();
    const inUse = useMemo(
        () => [...new Set([ledger.currency, ...overview.balances.accounts.map((row) => row.currency)])],
        [ledger.currency, overview.balances.accounts]
    );
    const [failed, setFailed] = useState(false);
    const editing = account !== null;
    const startBalance = account ? accountFacts(ledger, account.localId).balance : 0;
    const start = startValues(account, startType, startBalance, ledger.currency);

    const form = useForm({
        defaultValues: start,
        onSubmit: async ({ value }) => {
            setFailed(false);
            const decimals = decimalsFor(value.currency);
            const magnitude = parseAmount(value.balanceText, decimals);
            const balance = value.negative ? -magnitude : magnitude;
            const draft = accountDraft(value, parseAmount(value.limitText, decimals));
            const { books } = committer.current();
            const at = Date.now();
            const moneyTouched =
                value.balanceText !== start.balanceText ||
                value.negative !== start.negative ||
                value.currency !== start.currency;
            const row = account
                ? editedAccount(books, account, draft, moneyTouched ? balance : null, at)
                : createdAccount(books, draft, balance, crypto.randomUUID(), at);
            if (await committer.commit([row])) {
                onClose();
            } else {
                setFailed(true);
            }
        },
        validators: {
            onSubmit: ({ value }) =>
                value.name.trim() === "" ? { fields: { name: flows.nameRequired.value } } : undefined,
        },
    });

    const type = useStore(form.store, (state) => state.values.type);
    const liability = useStore(form.store, (state) => state.values.liability);
    const currency = useStore(form.store, (state) => state.values.currency);
    const identity = useStore(form.store, (state) => state.values.identity);
    const name = useStore(form.store, (state) => state.values.name);
    const attempted = useStore(form.store, (state) => state.submissionAttempts > 0);
    const seenPhoto = account?.imageKey ? photos.get(account.imageKey) : undefined;

    const pickType = (next: AccountType) => {
        form.setFieldValue("type", next);
        form.setFieldValue("liability", next === "card");
        form.setFieldValue("negative", next === "card");
        if (!form.state.values.identityByHand && form.state.values.identity.imageKey === null) {
            form.setFieldValue("identity", blankIdentity(next));
        }
    };
    const onName = (next: string) => {
        form.setFieldValue("name", next);
        if (!form.state.values.identityByHand) {
            form.setFieldValue("identity", logoFor(next) ?? blankIdentity(form.state.values.type));
        }
    };
    const card = !editing && type === "card";
    const createTitle = card ? flows.newCardTitle : flows.newTitle;
    const dim = name.trim() === "" && !attempted;
    return (
        <FlowDialog label={editing ? flows.editTitle : createTitle}>
            <Dialog.Body>
                <form
                    className="flex flex-col gap-4"
                    id={id}
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    {editing ? null : <TypePicker onPick={pickType} value={type} />}
                    <form.Field name="name">
                        {(field) => {
                            const [error] = field.state.meta.errors;
                            return (
                                <div
                                    className={editing ? "flex gap-4" : "mt-1 flex gap-4"}
                                    style={{ alignItems: error ? "flex-start" : "flex-end" }}
                                >
                                    <IdentityPicker
                                        handPicked={form.state.values.identityByHand}
                                        identity={
                                            seenPhoto && !identity.preview
                                                ? { ...identity, preview: seenPhoto }
                                                : identity
                                        }
                                        initials={name.trim().charAt(0).toLocaleUpperCase(locale)}
                                        label={flows.icon.value}
                                        onChange={(next) => {
                                            form.setFieldValue("identity", next);
                                            form.setFieldValue("identityByHand", true);
                                        }}
                                        photoError={flows.photoFailed.value}
                                    />
                                    <Field className="flex-1" invalid={Boolean(error)}>
                                        <Field.Label className="data-invalid:text-foreground">{flows.name}</Field.Label>
                                        <Input
                                            className="aria-invalid:ring-[3px]"
                                            onBlur={field.handleBlur}
                                            onChange={(event) => onName(event.target.value)}
                                            placeholder={flows.namePlaceholder.value}
                                            ref={editing ? undefined : focusNode}
                                            value={field.state.value}
                                        />
                                        {error ? <Field.Error match>{String(error)}</Field.Error> : null}
                                    </Field>
                                </div>
                            );
                        }}
                    </form.Field>
                    <div className="grid grid-cols-2 gap-3">
                        <form.Field name="currency">
                            {(field) => (
                                <CurrencyField
                                    inUse={inUse}
                                    label={flows.currency}
                                    onPick={field.handleChange}
                                    value={field.state.value}
                                />
                            )}
                        </form.Field>
                        <Field>
                            <Field.Label>{flows.balance}</Field.Label>
                            <form.Field name="balanceText">
                                {(text) => (
                                    <form.Field name="negative">
                                        {(negative) => (
                                            <AmountInput
                                                currency={currency}
                                                negative={negative.state.value}
                                                onNegative={negative.handleChange}
                                                onText={text.handleChange}
                                                text={text.state.value}
                                            />
                                        )}
                                    </form.Field>
                                )}
                            </form.Field>
                        </Field>
                    </div>
                    {editing ? (
                        <form.Field name="liability">
                            {(field) => (
                                <Field className="-mb-2 h-9 justify-center">
                                    <Field.Label>
                                        <Label.Text className="text-[13px]">{flows.moneyIOwe}</Label.Text>
                                        <Label.Action>
                                            <Switch
                                                className="[--switch-thumb:white]"
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                                size="xs"
                                            />
                                        </Label.Action>
                                    </Field.Label>
                                </Field>
                            )}
                        </form.Field>
                    ) : null}
                    {liability ? (
                        <>
                            <Field>
                                <Field.Label>{flows.creditLimit}</Field.Label>
                                <form.Field name="limitText">
                                    {(field) => (
                                        <AmountInput
                                            currency={currency}
                                            onText={field.handleChange}
                                            text={field.state.value}
                                        />
                                    )}
                                </form.Field>
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <form.Field name="statementDay">
                                    {(field) => (
                                        <DayField
                                            label={flows.statementCloses}
                                            onChange={field.handleChange}
                                            value={field.state.value}
                                        />
                                    )}
                                </form.Field>
                                <form.Field name="paymentDay">
                                    {(field) => (
                                        <DayField
                                            label={flows.paymentDue}
                                            onChange={field.handleChange}
                                            value={field.state.value}
                                        />
                                    )}
                                </form.Field>
                            </div>
                        </>
                    ) : null}
                    {failed && account ? (
                        <p className="text-destructive text-[13px]" role="alert">
                            {flows.saveFailed}
                        </p>
                    ) : null}
                </form>
            </Dialog.Body>
            <Dialog.Footer>
                {account ? <EditActions accountId={account.localId} onSwitch={onSwitch} /> : null}
                {failed && !account ? (
                    <span
                        className="text-destructive mr-auto h-auto! min-w-0 flex-[0_1_auto]! rounded-none! text-[13px] leading-5"
                        role="alert"
                    >
                        {flows.saveFailed}
                    </span>
                ) : null}
                <Button className={FOOTER_PILL} onClick={onClose} variant="secondary">
                    {flows.cancel}
                </Button>
                <Button className={dim ? `opacity-50 ${FOOTER_PILL}` : FOOTER_PILL} form={id} type="submit">
                    {card ? flows.saveCard : flows.saveAccount}
                </Button>
            </Dialog.Footer>
        </FlowDialog>
    );
}
