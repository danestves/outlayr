import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { toAccountKind } from "@outlayr/money/account-kind";
import { decimalsFor } from "@outlayr/money/currency";
import { resolveInstitutionDomain } from "@outlayr/money/institution-map";
import { merchantKey } from "@outlayr/money/merchant-key";
import {
    RiArchiveLine,
    RiArrowDownSLine,
    RiBankCardLine,
    RiBankLine,
    RiDeleteBin6Line,
    RiWallet3Line,
} from "@remixicon/react";
import { useForm, useStore } from "@tanstack/react-form";
import { Select } from "panelui-web/select";
import { Switch } from "panelui-web/switch";
import { useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { createdAccount, editedAccount, parseAmount } from "@/lib/account-writes";
import { commitRows } from "@/lib/ledger-commit";
import { ledgerBooks } from "@/lib/ledger-db";

import { AmountInput, amountText, CurrencyField, FlowDialog } from "./fields";
import { useLedgerDb } from "./flows";
import type { AccountFlow, AccountType } from "./flows";
import { IdentityPicker, logoIdentity, logoUrl } from "./identity-picker";
import type { Identity } from "./identity-picker";
import { accountFacts } from "./model";

type Account = LedgerBooks["accounts"][number];

const DEFAULT_ICON: Record<AccountType, string> = { bank: "Bank", card: "CreditCard", cash: "Wallet01" };
const DAYS = Array.from({ length: 28 }, (_, index) => String(index + 1));
const DEFAULT_STATEMENT = 25;
const DEFAULT_PAYMENT = 20;

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

function DayField({
    id,
    label,
    onChange,
    value,
}: {
    id: string;
    label: ReactNode;
    onChange: (day: number) => void;
    value: number;
}) {
    const { flows } = useIntlayer("dashboard-accounts");
    return (
        <div>
            <label className="dash-lb" htmlFor={id}>
                {label}
            </label>
            <Select
                items={DAYS.map((day) => ({ label: flows.day({ day }).value, value: day }))}
                onValueChange={(day) => day && onChange(Number(day))}
                value={String(value)}
            >
                <Select.Trigger className="dash-fi dash-figure" icon={<RiArrowDownSLine size={16} />} id={id}>
                    <Select.Value />
                </Select.Trigger>
                <Select.Content className="app-shell z-[60]">
                    {DAYS.map((day) => (
                        <Select.Item key={day} value={day}>
                            {flows.day({ day })}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
        </div>
    );
}

function FormFooter({
    account,
    dim,
    failed,
    label,
    onClose,
    onSwitch,
}: {
    account: Account | null;
    dim: boolean;
    failed: boolean;
    label: ReactNode;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { actions, flows } = useIntlayer("dashboard-accounts");
    return (
        <div className="dash-df">
            {account ? (
                <>
                    <button
                        className="dash-ob"
                        onClick={() => onSwitch({ accountId: account.localId, kind: "archive" })}
                        type="button"
                    >
                        <RiArchiveLine size={16} />
                        {flows.archive}
                    </button>
                    <button
                        className="dash-ob text-app-spend [&>svg]:text-app-spend! mr-auto"
                        onClick={() => onSwitch({ accountId: account.localId, kind: "delete" })}
                        type="button"
                    >
                        <RiDeleteBin6Line size={16} />
                        {actions.delete}
                    </button>
                </>
            ) : null}
            {failed ? <span className="text-app-spend mr-auto text-[13px]">{flows.saveFailed}</span> : null}
            <button className="dash-ob" onClick={onClose} type="button">
                {flows.cancel}
            </button>
            <button className={`dash-btn ${dim ? "opacity-50" : ""}`} type="submit">
                {label}
            </button>
        </div>
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
    const db = useLedgerDb();
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
    const startCurrency = account?.currency ?? ledger.currency;
    const kindOfType = startType === "card" ? "liability" : "asset";
    const startKind = account ? toAccountKind(account.kind) : kindOfType;
    const startNegative = startBalance < 0 || (startBalance === 0 && startKind === "liability");
    const startText = account ? amountText(Math.abs(startBalance), startCurrency) : "";
    const nameInput = useRef<HTMLInputElement>(null);

    const form = useForm({
        defaultValues: {
            balanceText: startText,
            currency: startCurrency,
            identity: account ? identityOf(account) : blankIdentity(startType),
            identityByHand: account ? Boolean(account.imageKey || account.emoji || account.icon) : false,
            limitText: account?.creditLimit ? amountText(account.creditLimit, startCurrency) : "",
            liability: startKind === "liability",
            name: account?.name ?? "",
            negative: startNegative,
            paymentDay: account?.paymentDay ?? DEFAULT_PAYMENT,
            statementDay: account?.statementDay ?? DEFAULT_STATEMENT,
            type: startType,
        },
        onSubmit: async ({ value }) => {
            setFailed(false);
            const decimals = decimalsFor(value.currency);
            const magnitude = parseAmount(value.balanceText, decimals);
            const balance = value.negative ? -magnitude : magnitude;
            const limit = parseAmount(value.limitText, decimals);
            const draft = {
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
            const books = ledgerBooks(db);
            const at = Date.now();
            const moneyTouched =
                value.balanceText !== startText || value.negative !== startNegative || value.currency !== startCurrency;
            const row = account
                ? editedAccount(books, account, draft, moneyTouched ? balance : null, at)
                : createdAccount(books, draft, balance, crypto.randomUUID(), at);
            try {
                await commitRows(db, [row]);
                onClose();
            } catch {
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
    const types = [
        { icon: RiBankLine, label: flows.bank, value: "bank" },
        { icon: RiWallet3Line, label: flows.cash, value: "cash" },
        { icon: RiBankCardLine, label: flows.cardOrLoan, value: "card" },
    ] as const;

    return (
        <FlowDialog
            initialFocus={editing ? undefined : nameInput}
            label={editing ? flows.editTitle : createTitle}
            onClose={onClose}
        >
            <form
                className="flex min-h-0 flex-col"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    void form.handleSubmit();
                }}
            >
                <div className="dash-db">
                    {editing ? null : (
                        <div className="dash-ty mb-5">
                            {types.map(({ icon: Icon, label, value }) => (
                                <button
                                    aria-pressed={type === value}
                                    key={value}
                                    onClick={() => pickType(value)}
                                    type="button"
                                >
                                    <Icon size={17} />
                                    <span className="truncate">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <form.Field name="name">
                        {(field) => {
                            const [error] = field.state.meta.errors;
                            return (
                                <div className="flex gap-4" style={{ alignItems: error ? "flex-start" : "flex-end" }}>
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
                                    <div className="min-w-0 flex-1">
                                        <label className="dash-lb" htmlFor={`${id}-name`}>
                                            {flows.name}
                                        </label>
                                        <div className="dash-fi" data-invalid={error ? "true" : undefined}>
                                            <input
                                                id={`${id}-name`}
                                                onBlur={field.handleBlur}
                                                onChange={(event) => onName(event.target.value)}
                                                placeholder={flows.namePlaceholder.value}
                                                ref={nameInput}
                                                value={field.state.value}
                                            />
                                        </div>
                                        {error ? <p className="dash-er">{String(error)}</p> : null}
                                    </div>
                                </div>
                            );
                        }}
                    </form.Field>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                            <label className="dash-lb" htmlFor={`${id}-currency`}>
                                {flows.currency}
                            </label>
                            <form.Field name="currency">
                                {(field) => (
                                    <CurrencyField
                                        id={`${id}-currency`}
                                        inUse={inUse}
                                        onPick={field.handleChange}
                                        value={field.state.value}
                                    />
                                )}
                            </form.Field>
                        </div>
                        <div>
                            <label className="dash-lb" htmlFor={`${id}-balance`}>
                                {flows.balance}
                            </label>
                            <form.Field name="balanceText">
                                {(text) => (
                                    <form.Field name="negative">
                                        {(negative) => (
                                            <AmountInput
                                                currency={currency}
                                                id={`${id}-balance`}
                                                negative={negative.state.value}
                                                onNegative={negative.handleChange}
                                                onText={text.handleChange}
                                                text={text.state.value}
                                            />
                                        )}
                                    </form.Field>
                                )}
                            </form.Field>
                        </div>
                    </div>
                    {editing ? (
                        <form.Field name="liability">
                            {(field) => (
                                <div className="mt-4 flex h-9 items-center justify-between">
                                    <label className="text-[13px] font-medium" htmlFor={`${id}-owe`}>
                                        {flows.moneyIOwe}
                                    </label>
                                    <Switch
                                        checked={field.state.value}
                                        className="origin-right scale-[.82]"
                                        id={`${id}-owe`}
                                        onCheckedChange={field.handleChange}
                                        size="sm"
                                    />
                                </div>
                            )}
                        </form.Field>
                    ) : null}
                    {liability ? (
                        <>
                            <div className={editing ? "mt-2" : "mt-4"}>
                                <label className="dash-lb" htmlFor={`${id}-limit`}>
                                    {flows.creditLimit}
                                </label>
                                <form.Field name="limitText">
                                    {(field) => (
                                        <AmountInput
                                            currency={currency}
                                            id={`${id}-limit`}
                                            onText={field.handleChange}
                                            text={field.state.value}
                                        />
                                    )}
                                </form.Field>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <form.Field name="statementDay">
                                    {(field) => (
                                        <DayField
                                            id={`${id}-statement`}
                                            label={flows.statementCloses}
                                            onChange={field.handleChange}
                                            value={field.state.value}
                                        />
                                    )}
                                </form.Field>
                                <form.Field name="paymentDay">
                                    {(field) => (
                                        <DayField
                                            id={`${id}-payment`}
                                            label={flows.paymentDue}
                                            onChange={field.handleChange}
                                            value={field.state.value}
                                        />
                                    )}
                                </form.Field>
                            </div>
                        </>
                    ) : null}
                </div>
                <FormFooter
                    account={account}
                    dim={name.trim() === "" && !attempted}
                    failed={failed}
                    label={card ? flows.saveCard : flows.saveAccount}
                    onClose={onClose}
                    onSwitch={onSwitch}
                />
            </form>
        </FlowDialog>
    );
}
