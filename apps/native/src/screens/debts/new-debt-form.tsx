import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Keyboard } from "react-native";

import { AccountPickerSheet } from "@/components/account-picker-sheet";
import { AmountEntrySheet } from "@/components/amount-entry-sheet";
import { CategoryPickerSheet } from "@/components/category-picker-sheet";
import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { useDatabase } from "@/contexts/local-data-context";
import { useAccountBalance, useBankAccounts, usePeople } from "@/data/accounts";
import { accountsRepo, getLastUsedAccount } from "@/data/accounts-core";
import type { Account } from "@/data/accounts-core";
import { useGlobalCurrency } from "@/data/app-meta";
import type { Category } from "@/data/categories-core";
import { createPerson, recordDebtMovement, recordOutsideMove, recordSoldOnCredit } from "@/data/debts-core";
import { setPayoffPlan } from "@/data/payoff-plans";
import { useNow } from "@/data/use-now";
import type { Database } from "@/db/client";
import { comesFromPerson, debtChoices, debtStanding } from "@/domain/debt-choices";
import type { DebtVerb } from "@/domain/debts";
import { addLocalMonths } from "@/domain/local-day";
import { minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { useAccountCreateRoute, usePayoffPlanGate, usePeopleCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

const MAX_SUGGESTIONS = 4;

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

interface DebtDraft {
    account: Account | null;
    amount: number;
    /** Set for a sale on credit, which records income instead of a movement. */
    category: Category | null;
    currency: string;
    date: Date;
    newName: string;
    note: string;
    person: Account | null;
    /** The person's side of a cross-currency movement, in their currency. */
    theirAmount: number;
    verb: DebtVerb;
}

async function writeDebt(db: Database, draft: DebtDraft): Promise<string> {
    const { account, amount, category, currency, person } = draft;
    const note = draft.note === "" ? undefined : draft.note;
    if (category !== null) {
        const buyer = person ?? { currency, id: await createPerson(db, { currency, name: draft.newName }) };
        await recordSoldOnCredit(db, { amount, categoryId: category.id, date: draft.date, note, person: buyer });
        return buyer.id;
    }
    if (account === null && person !== null) {
        await recordOutsideMove(db, { amount, date: draft.date, note, person, verb: draft.verb });
        return person.id;
    }
    if (account === null) {
        return await createPerson(db, {
            currency,
            name: draft.newName,
            openingBalance: comesFromPerson(draft.verb) ? -amount : amount,
        });
    }
    const target = person ?? { currency, id: await createPerson(db, { currency, name: draft.newName }) };
    const crossCurrency = target.currency !== account.currency;
    await recordDebtMovement(db, {
        account: { accountId: account.id, amount, currency: account.currency },
        date: draft.date,
        note,
        person: { accountId: target.id, amount: crossCurrency ? draft.theirAmount : amount, currency: target.currency },
        rateType: crossCurrency ? "custom" : null,
        verb: draft.verb,
    });
    return target.id;
}

export async function writePayoffPlan(db: Database, personId: string, targetDate: Date): Promise<void> {
    const people = await accountsRepo.listActive(db);
    const person = people.find((row) => row.id === personId);
    if (person) {
        await setPayoffPlan(db, person, targetDate);
    }
}

interface DraftInput {
    account: Account | null;
    amountText: string;
    category: Category | null;
    name: string;
    newCurrency: string;
    person: Account | null;
    soldOnCredit: boolean;
    theirText: string;
}

function readDraft(input: DraftInput) {
    const { account, category, person, soldOnCredit } = input;
    const before = !soldOnCredit && account === null && person === null;
    const currency = (soldOnCredit ? null : account?.currency) ?? person?.currency ?? input.newCurrency;
    const amount = roundToMinorUnits(numpadToNumber(input.amountText), currency);
    const crossCurrency = !soldOnCredit && person !== null && account !== null && person.currency !== account.currency;
    const theirAmount = person === null ? 0 : roundToMinorUnits(numpadToNumber(input.theirText), person.currency);
    const newName = person === null ? input.name.trim() : "";
    const complete =
        amount > 0 &&
        (person !== null || newName !== "") &&
        (!soldOnCredit || category !== null) &&
        (!crossCurrency || theirAmount > 0);
    const theirCurrency = crossCurrency ? person.currency : null;
    const pickCurrency = person === null && (soldOnCredit || account === null);
    return { amount, before, complete, currency, newName, pickCurrency, theirAmount, theirCurrency };
}

export function present(sheet: RefObject<BottomSheetModal | null>) {
    Keyboard.dismiss();
    sheet.current?.present();
}

export interface NewDebtProps {
    onDirtyChange: (dirty: boolean) => void;
    onDone: () => void;
    personId?: string;
    verb?: DebtVerb;
}

export function useNewDebtForm({ onDirtyChange, onDone, personId, verb: initialVerb }: NewDebtProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const people = usePeople(db);
    const banks = useBankAccounts(db);
    const globalCurrency = useGlobalCurrency(db);
    const peopleCapped = usePeopleCapped();
    const payoffGate = usePayoffPlanGate();
    const nowMs = useNow();

    const [name, setName] = useState("");
    const { lockedPerson, person, suggestions } = resolvePerson(people, personId, name);

    const [verb, setVerb] = useState<DebtVerb>(initialVerb ?? "borrowed");
    const [soldOnCredit, setSoldOnCredit] = useState(false);
    const [category, setCategory] = useState<Category | null>(null);
    const [accountId, setAccountId] = useState<string | null>(() => getLastUsedAccount(db)?.id ?? banks[0]?.id ?? null);
    const account = banks.find((row) => row.id === accountId) ?? null;
    const [newCurrency, setNewCurrency] = useState(globalCurrency);
    const [amountText, setAmountText] = useState("");
    const [theirText, setTheirText] = useState("");
    const [date, setDate] = useState(() => new Date());
    const [note, setNote] = useState("");
    const [payBackBy, setPayBackBy] = useState<Date | null>(null);
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

    const draft = readDraft({ account, amountText, category, name, newCurrency, person, soldOnCredit, theirText });

    useEffect(() => {
        onDirtyChange(amountText !== "" || name.trim() !== "" || note.trim() !== "" || payBackBy !== null);
    }, [amountText, name, note, payBackBy, onDirtyChange]);

    const save = async () => {
        if (person === null && peopleCapped) {
            router.push("/paywall");
            return;
        }
        setBusy(true);
        setFailure(null);
        let debtorId: string;
        try {
            debtorId = await writeDebt(db, {
                account,
                amount: draft.amount,
                category: soldOnCredit ? category : null,
                currency: draft.currency,
                date,
                newName: draft.newName,
                note: note.trim(),
                person,
                theirAmount: draft.theirAmount,
                verb: choice.verb,
            });
        } catch (error) {
            console.error("Failed to save the debt", error);
            haptics("error");
            setFailure(t("debts.error.saveFailed"));
            setBusy(false);
            return;
        }
        // A failed plan is reported, but the debt stands.
        if (payBackBy !== null) {
            try {
                await writePayoffPlan(db, debtorId, payBackBy);
            } catch (error) {
                console.error("Failed to save the payoff plan", error);
                notifyFailure({ title: t("debts.plan.failed") });
            }
        }
        rearmInstallmentReminders(db);
        haptics("success");
        onDone();
    };
    const handlers = useRef({ save });
    useLayoutEffect(() => {
        handlers.current = { save };
    });
    // Reads only the ref, so Save does not re-register per keystroke.
    const onSave = () => {
        void handlers.current.save();
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
    const router = useRouter();
    const t = useTranslation();
    const accountCreateRoute = useAccountCreateRoute();
    const { accountSheet, amountSheet, categorySheet, currencySheet, person, theirSheet } = form;

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
            {person === null ? null : (
                <AmountEntrySheet
                    code={person.currency}
                    minorUnits={minorUnitsFor(person.currency)}
                    onChange={form.setTheirText}
                    onDone={() => theirSheet.current?.dismiss()}
                    ref={theirSheet}
                    value={form.theirText}
                />
            )}
            <AccountPickerSheet
                db={db}
                noneLabel={person === null ? undefined : t("debts.field.outside")}
                onCreate={() => {
                    accountSheet.current?.dismiss();
                    router.push(accountCreateRoute);
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
                selected={form.currency}
            />
        </>
    );
}
