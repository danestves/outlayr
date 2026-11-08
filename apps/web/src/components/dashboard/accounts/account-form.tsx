import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { toAccountKind } from "@outlayr/money/account-kind";
import { decimalsFor } from "@outlayr/money/currency";
import { resolveInstitutionDomain } from "@outlayr/money/institution-map";
import { merchantKey } from "@outlayr/money/merchant-key";
import { RiArchiveLine, RiBankCardLine, RiBankLine, RiDeleteBin6Line, RiWallet3Line } from "@remixicon/react";
import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "panelui-web/button";
import { ChoiceCards } from "panelui-web/choice-cards";
import { Dialog } from "panelui-web/dialog";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { Label } from "panelui-web/label";
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
                <Select.Trigger>
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

function FormFooter({
    account,
    dim,
    failed,
    formId,
    label,
    onClose,
    onSwitch,
}: {
    account: Account | null;
    dim: boolean;
    failed: boolean;
    formId: string;
    label: ReactNode;
    onClose: () => void;
    onSwitch: (flow: AccountFlow) => void;
}) {
    const { actions, flows } = useIntlayer("dashboard-accounts");
    return (
        <Dialog.Footer>
            {account ? (
                <>
                    <Button onClick={() => onSwitch({ accountId: account.localId, kind: "archive" })} variant="outline">
                        <RiArchiveLine size={16} />
                        {flows.archive}
                    </Button>
                    <Button
                        className="text-destructive mr-auto"
                        onClick={() => onSwitch({ accountId: account.localId, kind: "delete" })}
                        variant="outline"
                    >
                        <RiDeleteBin6Line size={16} />
                        {actions.delete}
                    </Button>
                </>
            ) : null}
            {failed ? <span className="text-destructive mr-auto text-[13px]">{flows.saveFailed}</span> : null}
            <Button onClick={onClose} variant="outline">
                {flows.cancel}
            </Button>
            <Button className={dim ? "opacity-50" : undefined} form={formId} type="submit">
                {label}
            </Button>
        </Dialog.Footer>
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
                    {editing ? null : (
                        <ChoiceCards
                            aria-label={flows.accountType.value}
                            aspect="5 / 2"
                            onValueChange={(next) => {
                                const picked = types.find((each) => each.value === next);
                                if (picked) {
                                    pickType(picked.value);
                                }
                            }}
                            value={type}
                        >
                            {types.map(({ icon: Icon, label, value }) => (
                                <ChoiceCards.Item key={value} value={value}>
                                    <ChoiceCards.Media>
                                        <Icon size={20} />
                                    </ChoiceCards.Media>
                                    <ChoiceCards.Label>{label}</ChoiceCards.Label>
                                </ChoiceCards.Item>
                            ))}
                        </ChoiceCards>
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
                                    <Field className="flex-1" invalid={Boolean(error)}>
                                        <Field.Label>{flows.name}</Field.Label>
                                        <Input
                                            onBlur={field.handleBlur}
                                            onChange={(event) => onName(event.target.value)}
                                            placeholder={flows.namePlaceholder.value}
                                            ref={nameInput}
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
                                <Field>
                                    <Field.Label>
                                        <Label.Text>{flows.moneyIOwe}</Label.Text>
                                        <Label.Action>
                                            <Switch
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                                size="sm"
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
                </form>
            </Dialog.Body>
            <FormFooter
                account={account}
                dim={name.trim() === "" && !attempted}
                failed={failed}
                formId={id}
                label={card ? flows.saveCard : flows.saveAccount}
                onClose={onClose}
                onSwitch={onSwitch}
            />
        </FlowDialog>
    );
}
