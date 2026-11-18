import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import * as Result from "effect/Result";
import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Keyboard } from "react-native";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountBalance, useBankAccounts, usePeople } from "@/data/accounts";
import { getLastUsedAccount } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import type { Category } from "@/data/categories-core";
import { useTransferRates } from "@/data/transfer-rates";
import { useNow } from "@/data/use-now";
import { comesFromPerson, debtChoices, debtStanding } from "@/domain/debt-choices";
import { debtTheirSide, newPersonCurrency } from "@/domain/debt-rate";
import type { DebtRate } from "@/domain/debt-rate";
import type { DebtVerb } from "@/domain/debts";
import { addLocalMonths } from "@/domain/local-day";
import type { NotificationDebt } from "@/domain/meta-values";
import { formatFixed, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numberToNumpad, numpadToNumber } from "@/domain/numpad";
import { formatRateFigure, pairQuotedInverse, pairUnitSymbols, quotePairRate } from "@/domain/transaction-entry-rate";
import { quotedByBcv } from "@/domain/transaction-form-labels";
import { marketRateFor } from "@/domain/transfer-rate-options";
import { useCreateAccount, useOpenPaywall, usePayoffPlanGate, usePeopleCapped } from "@/hooks/use-pro-gate";
import { useLanguage, useTranslation } from "@/i18n/context";
import type { TranslateFn } from "@/i18n/context";
import type { Language } from "@/i18n/languages";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { dropNotificationDebtCommand, saveDebtCommand } from "@/state/debt-flow-commands";
import type { DebtDraft } from "@/state/planning-commands";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

const MAX_SUGGESTIONS = 4;
const OFFICIAL = ["official"] as const;
const CAPTION_DECIMALS = 2;

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export function resolvePerson(people: readonly Account[], personId: string | undefined, name: string) {
    const lockedPerson = personId === undefined ? null : (people.find((row) => row.id === personId) ?? null);
    const person = lockedPerson ?? people.find((row) => sameName(row.name, name)) ?? null;
    const query = name.trim().toLocaleLowerCase();
    const suggestions =
        person === null
            ? people.filter((row) => row.name.toLocaleLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)
            : [];
    return { lockedPerson, person, suggestions };
}

interface DraftInput {
    amountText: string;
    category: Category | null;
    funding: Account | null;
    market: number | null;
    name: string;
    person: Account | null;
    personCurrency: string;
    soldOnCredit: boolean;
    theirText: string;
}

function readDraft(input: DraftInput) {
    const { category, funding, person, personCurrency, soldOnCredit } = input;
    const before = funding === null && person === null && !soldOnCredit;
    const currency = funding?.currency ?? personCurrency;
    const amount = roundToMinorUnits(numpadToNumber(input.amountText), currency);
    const crossCurrency = funding !== null && funding.currency !== personCurrency;
    const side = crossCurrency
        ? debtTheirSide({
              amount,
              market: input.market,
              personCurrency,
              typed: roundToMinorUnits(numpadToNumber(input.theirText), personCurrency),
          })
        : null;
    const newName = person === null ? input.name.trim() : "";
    const complete =
        amount > 0 &&
        (person !== null || newName !== "") &&
        (!soldOnCredit || category !== null) &&
        (side === null || side.theirAmount > 0);
    return {
        amount,
        before,
        complete,
        currency,
        newName,
        personCurrency,
        pickCurrency: person === null,
        rate: side?.rate ?? null,
        theirAmount: side?.theirAmount ?? 0,
        theirCurrency: crossCurrency ? personCurrency : null,
    };
}

function rateCaption(t: TranslateFn, language: Language, from: string, to: string, rate: DebtRate | null) {
    if (rate === null) {
        return null;
    }
    const inverse = pairQuotedInverse(from, to);
    const quoted = quotePairRate(inverse, rate.personPerAccount);
    const digits = quoted >= 1 ? formatFixed(quoted, CAPTION_DECIMALS, language) : formatRateFigure(quoted, language);
    const figure = `${digits} ${pairUnitSymbols(from, to, inverse).quote}`;
    if (rate.type === "custom") {
        return t("debts.rate.typed", { rate: figure });
    }
    return t(quotedByBcv(from, to) ? "debts.rate.bcv" : "debts.rate.official", { rate: figure });
}

function isDirty(edits: { amountText: string; name: string; note: string; payBackBy: Date | null }) {
    return edits.amountText !== "" || edits.name.trim() !== "" || edits.note.trim() !== "" || edits.payBackBy !== null;
}

export function present(sheet: RefObject<BottomSheetModal | null>) {
    Keyboard.dismiss();
    sheet.current?.present();
}

export interface NewDebtProps {
    onDirtyChange: (dirty: boolean) => void;
    onDone: () => void;
    personId?: string;
    pushed?: NotificationDebt | null;
    verb?: DebtVerb;
}

export function useNewDebtForm({ onDirtyChange, onDone, personId, pushed, verb: initialVerb }: NewDebtProps) {
    const db = useDatabase();
    const openPaywall = useOpenPaywall();
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const people = usePeople(db);
    const banks = useBankAccounts(db);
    const globalCurrency = useGlobalCurrency(db);
    const peopleCapped = usePeopleCapped();
    const payoffGate = usePayoffPlanGate();
    const nowMs = useNow();

    const [name, setNameState] = useState(pushed?.counterparty ?? "");
    const { lockedPerson, person, suggestions } = resolvePerson(people, personId, name);

    const [verb, setVerb] = useState<DebtVerb>(pushed?.verb ?? initialVerb ?? "borrowed");
    const [soldOnCredit, setSoldOnCredit] = useState(false);
    const [category, setCategory] = useState<Category | null>(null);
    const [accountId, setAccountId] = useState<string | null>(() => getLastUsedAccount(db)?.id ?? banks[0]?.id ?? null);
    const account = banks.find((row) => row.id === accountId) ?? null;
    const [pickedCurrency, setPickedCurrency] = useState<string | null>(pushed?.currency ?? null);
    const [amountText, setAmountTextState] = useState(() =>
        pushed ? numberToNumpad(pushed.amount, minorUnitsFor(pushed.currency ?? globalCurrency)) : ""
    );
    const [theirText, setTheirText] = useState("");
    const setNewCurrency = (code: string) => {
        setPickedCurrency(code);
        setTheirText("");
    };
    const [date, setDate] = useState(() => (pushed ? new Date(pushed.date) : new Date()));
    const [note, setNoteState] = useState(pushed?.text ?? "");
    const [payBackBy, setPayBackByState] = useState<Date | null>(null);
    const edits = { amountText, name, note, payBackBy };
    const edit = (change: Partial<typeof edits>) => {
        onDirtyChange(isDirty({ ...edits, ...change }));
    };
    const setName = (value: string) => {
        setNameState(value);
        edit({ name: value });
    };
    const setAmountText = (value: string) => {
        setAmountTextState(value);
        edit({ amountText: value });
    };
    const setNote = (value: string) => {
        setNoteState(value);
        edit({ note: value });
    };
    const setPayBackBy = (value: Date | null) => {
        setPayBackByState(value);
        edit({ payBackBy: value });
    };
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const amountSheet = useRef<BottomSheetModal>(null);
    const theirSheet = useRef<BottomSheetModal>(null);
    const accountSheet = useRef<BottomSheetModal>(null);
    const currencySheet = useRef<BottomSheetModal>(null);
    const categorySheet = useRef<BottomSheetModal>(null);

    const balance = useAccountBalance(
        db,
        person ?? { currency: globalCurrency, id: "", initialBalance: 0 },
        nowMs
    ).total;
    const choices = debtChoices(person === null ? null : debtStanding(balance, person.currency));
    const incoming = !soldOnCredit && comesFromPerson(verb);
    const choice = choices.find((option) => comesFromPerson(option.verb) === incoming) ?? choices[0];

    const funding = soldOnCredit ? null : account;
    const personCurrency =
        person?.currency ?? pickedCurrency ?? newPersonCurrency(funding?.currency ?? null, globalCurrency);
    const fundingCurrency = funding?.currency ?? personCurrency;
    const { official } = useTransferRates(db, [fundingCurrency, personCurrency], OFFICIAL);
    const market = official === undefined ? null : marketRateFor(fundingCurrency, personCurrency, date, official);
    const draft = readDraft({
        amountText,
        category,
        funding,
        market,
        name,
        person,
        personCurrency,
        soldOnCredit,
        theirText,
    });

    const saveDebt = useAtomAction(
        saveDebtCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to save the debt", Cause.squash(cause));
                haptics("error");
                setFailure(t("debts.error.saveFailed"));
                setBusy(false);
            },
            onSuccess: (plan) => {
                // A failed plan is reported, but the debt stands.
                if (plan !== null && Result.isFailure(plan)) {
                    console.error("Failed to save the payoff plan", plan.failure);
                    notifyFailure({ title: t("debts.plan.failed") });
                }
                rearmInstallmentReminders(db);
                haptics("success");
                onDone();
            },
        },
        SILENT
    );

    const dropDraft = useAtomAction(
        dropNotificationDebtCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to discard the notification draft", Cause.squash(cause));
                haptics("error");
            },
            onSuccess: onDone,
        },
        SILENT
    );

    const save = () => {
        if (person === null && peopleCapped) {
            openPaywall("people");
            return;
        }
        setBusy(true);
        setFailure(null);
        const debt: DebtDraft = {
            account,
            amount: draft.amount,
            category: soldOnCredit ? category : null,
            date,
            newName: draft.newName,
            note: note.trim(),
            person,
            personCurrency: draft.personCurrency,
            rate: draft.rate,
            theirAmount: draft.theirAmount,
            verb: choice.verb,
        };
        saveDebt({ db, debt, fromPush: pushed?.id, payBackBy });
    };
    const handlers = useRef({ save });
    // oxlint-disable-next-line outlayr/react-effect-budget -- keeps the latest save behind the stable press handler the native header button registers once
    useLayoutEffect(() => {
        handlers.current = { save };
    });
    // Reads only the ref, so Save does not re-register per keystroke.
    const onSave = () => {
        handlers.current.save();
    };

    return {
        ...draft,
        account,
        accountId,
        accountSheet,
        accountLabel: t(incoming ? "debts.field.accountInto" : "debts.field.accountFrom"),
        accountValue: account?.name ?? t(person === null ? "debts.field.before" : "debts.field.outside"),
        amountSheet,
        amountText,
        canSave: !busy && draft.complete,
        category,
        categorySheet,
        choice,
        choices,
        currencySheet,
        date,
        discard: pushed ? () => dropDraft({ db, id: pushed.id }) : null,
        failure,
        lockedPerson,
        name,
        note,
        nowMs,
        onSave,
        openPayBackBy: () => payoffGate(person?.id ?? null, () => setPayBackBy(addLocalMonths(nowMs, 1))),
        payBackBy,
        person,
        personLabel: t(incoming ? "debts.field.personFrom" : "debts.field.personTo"),
        rateCaption: rateCaption(t, language, fundingCurrency, personCurrency, draft.rate),
        setAccountId,
        setAmountText,
        setCategory,
        setDate,
        setName,
        setNewCurrency,
        setNote,
        setPayBackBy,
        setSoldOnCredit,
        setTheirText,
        setVerb,
        soldOnCredit,
        suggestions,
        theirSheet,
        theirText,
    };
}

export function NewDebtSheets({ form }: { form: ReturnType<typeof useNewDebtForm> }) {
    const db = useDatabase();
    const t = useTranslation();
    const createAccount = useCreateAccount();
    const { accountSheet, amountSheet, categorySheet, currencySheet, theirSheet } = form;

    return (
        <>
            <AmountEntrySheet
                code={form.currency}
                minorUnits={minorUnitsFor(form.currency)}
                onChange={form.setAmountText}
                onDone={() => amountSheet.current?.dismiss()}
                ref={amountSheet}
                value={form.amountText}
            />
            <AmountEntrySheet
                code={form.personCurrency}
                minorUnits={minorUnitsFor(form.personCurrency)}
                onChange={form.setTheirText}
                onDone={() => theirSheet.current?.dismiss()}
                ref={theirSheet}
                value={form.theirText}
            />
            <AccountPickerSheet
                db={db}
                noneLabel={form.person === null ? undefined : t("debts.field.outside")}
                onCreate={() => {
                    accountSheet.current?.dismiss();
                    createAccount();
                }}
                onSelect={(picked: Account | null) => form.setAccountId(picked?.id ?? null)}
                ref={accountSheet}
                selectedId={form.accountId}
            />
            <CategoryPickerSheet
                db={db}
                income
                onSelect={(picked) => {
                    categorySheet.current?.dismiss();
                    form.setCategory(picked);
                }}
                ref={categorySheet}
                selectedId={form.category?.id ?? null}
            />
            <CurrencyPickerSheet
                onSelect={(code) => {
                    currencySheet.current?.dismiss();
                    form.setNewCurrency(code);
                }}
                ref={currencySheet}
                selected={form.personCurrency}
            />
        </>
    );
}
