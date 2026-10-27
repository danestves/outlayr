import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import * as Cause from "effect/Cause";
import * as Result from "effect/Result";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { usePeople } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import type { Category } from "@/data/categories-core";
import { useNow } from "@/data/use-now";
import { payDays } from "@/domain/local-day";
import type { PayDays } from "@/domain/local-day";
import { roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { usePayoffPlanGate, usePeopleCapped } from "@/hooks/use-pro-gate";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { saveOweCommand } from "@/state/debt-flow-commands";
import type { OweDraft } from "@/state/planning-commands";
import { askForInstallmentReminders, rearmInstallmentReminders } from "@/state/surfaces-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { resolvePerson } from "./new-debt-form";

export type OweSlot = "amount" | "category" | "what" | "when" | "who";

export type PayBy = keyof PayDays | "none";

export interface OweProps {
    onDirtyChange: (dirty: boolean) => void;
    onDone: () => void;
}

function isDirty(edits: { amountText: string; category: Category | null; name: string; payBy: PayBy; what: string }) {
    return (
        edits.amountText !== "" ||
        edits.name.trim() !== "" ||
        edits.what.trim() !== "" ||
        edits.category !== null ||
        edits.payBy !== "none"
    );
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

    const [name, setNameState] = useState("");
    const { person, suggestions } = resolvePerson(people, undefined, name);
    const [newCurrency, setNewCurrency] = useState(globalCurrency);
    const [amountText, setAmountTextState] = useState("");
    const [what, setWhatState] = useState("");
    const [category, setCategoryState] = useState<Category | null>(null);
    const [payBy, setPayByState] = useState<PayBy>("none");
    const edits = { amountText, category, name, payBy, what };
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
    const setWhat = (value: string) => {
        setWhatState(value);
        edit({ what: value });
    };
    const setCategory = (value: Category | null) => {
        setCategoryState(value);
        edit({ category: value });
    };
    const setPayBy = (value: PayBy) => {
        setPayByState(value);
        edit({ payBy: value });
    };
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

    const saveOwe = useAtomAction(
        saveOweCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to save what you owe", Cause.squash(cause));
                haptics("error");
                setFailure(t("debts.error.saveFailed"));
                setBusy(false);
            },
            onSuccess: (plan) => {
                if (plan !== null && Result.isFailure(plan)) {
                    console.error("Failed to save the payoff plan", plan.failure);
                    notifyFailure({ title: t("debts.plan.failed") });
                } else if (plan !== null) {
                    rearmInstallmentReminders(db);
                }
                haptics("success");
                onDone();
                if (targetDate !== null) {
                    askForInstallmentReminders(db, "debts.reminder.ask");
                }
            },
        },
        SILENT
    );

    const save = () => {
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
        const owe: OweDraft = {
            amount,
            categoryId: category.id,
            currency,
            newName,
            note: note === "" ? undefined : note,
            person,
        };
        saveOwe({ db, owe, targetDate });
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
