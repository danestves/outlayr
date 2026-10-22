import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { usePeople } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import type { Category } from "@/data/categories-core";
import { createPerson, recordBoughtOnCredit } from "@/data/debts-core";
import { useNow } from "@/data/use-now";
import { payDays } from "@/domain/local-day";
import type { PayDays } from "@/domain/local-day";
import { roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { usePayoffPlanGate, usePeopleCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { askForInstallmentReminders } from "@/lib/due-reminders";
import { rearmInstallmentReminders } from "@/lib/installment-reminder-sync";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";

import { resolvePerson, writePayoffPlan } from "./new-debt-form";

export type OweSlot = "amount" | "category" | "what" | "when" | "who";

export type PayBy = keyof PayDays | "none";

export interface OweProps {
    onDirtyChange: (dirty: boolean) => void;
    onDone: () => void;
}

export function useOweForm({ onDirtyChange, onDone }: OweProps) {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const haptics = useHaptics();
    const people = usePeople(db);
    const globalCurrency = useGlobalCurrency(db);
    const peopleCapped = usePeopleCapped();
    const payoffGate = usePayoffPlanGate();
    const days = payDays(useNow());

    const [name, setName] = useState("");
    const { person, suggestions } = resolvePerson(people, undefined, name);
    const [newCurrency, setNewCurrency] = useState(globalCurrency);
    const [amountText, setAmountText] = useState("");
    const [what, setWhat] = useState("");
    const [category, setCategory] = useState<Category | null>(null);
    const [payBy, setPayBy] = useState<PayBy>("none");
    const [active, setActive] = useState<OweSlot>("who");
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const amountSheet = useRef<BottomSheetModal>(null);
    const categorySheet = useRef<BottomSheetModal>(null);
    const currencySheet = useRef<BottomSheetModal>(null);

    const currency = person?.currency ?? newCurrency;
    const amount = roundToMinorUnits(numpadToNumber(amountText), currency);
    const newName = person === null ? name.trim() : "";
    const targetDate = payBy === "none" ? null : days[payBy];
    const complete = amount > 0 && (person !== null || newName !== "") && category !== null;

    useEffect(() => {
        onDirtyChange(
            amountText !== "" || name.trim() !== "" || what.trim() !== "" || category !== null || payBy !== "none"
        );
    }, [amountText, category, name, onDirtyChange, payBy, what]);

    const save = async () => {
        if (category === null) {
            return;
        }
        if (person === null && peopleCapped) {
            router.push("/paywall");
            return;
        }
        setBusy(true);
        setFailure(null);
        const note = what.trim();
        let personId: string;
        try {
            const owed = person ?? { currency, id: await createPerson(db, { currency, name: newName }) };
            await recordBoughtOnCredit(db, {
                amount,
                categoryId: category.id,
                date: new Date(),
                note: note === "" ? undefined : note,
                person: owed,
            });
            personId = owed.id;
        } catch (error) {
            console.error("Failed to save what you owe", error);
            haptics("error");
            setFailure(t("debts.error.saveFailed"));
            setBusy(false);
            return;
        }
        if (targetDate !== null) {
            try {
                await writePayoffPlan(db, personId, targetDate);
                rearmInstallmentReminders(db);
            } catch (error) {
                console.error("Failed to save the payoff plan", error);
                notifyFailure({ title: t("debts.plan.failed") });
            }
        }
        haptics("success");
        onDone();
        if (targetDate !== null) {
            askForInstallmentReminders(db, "debts.reminder.ask");
        }
    };

    return {
        active,
        amount,
        amountSheet,
        amountText,
        busy,
        canSave: !busy && complete,
        category,
        categorySheet,
        currency,
        currencySheet,
        days,
        failure,
        name,
        onSave: () => {
            void save();
        },
        payBy,
        person,
        pickPayBy: (next: PayBy) =>
            next === "none" ? setPayBy(next) : payoffGate(person?.id ?? null, () => setPayBy(next)),
        setActive,
        setAmountText,
        setCategory,
        setName,
        setNewCurrency,
        setWhat,
        suggestions,
        what,
    };
}
