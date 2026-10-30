import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { useRef, useState } from "react";
import { Keyboard } from "react-native";

import { NO_READ, useLiveQuery } from "@/data/live-query";
import { splitsForQuery } from "@/data/splits-core";
import type { Transaction } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { transactionSplits } from "@/db/schema";
import { minorUnitsFor } from "@/domain/money";
import { isBalanced } from "@/domain/split";
import type { Allocation } from "@/domain/split";
import { isRealSplit, openDraft } from "@/domain/split-draft";
import { useTranslation } from "@/i18n/context";

import { SplitSheet } from "../split-sheet";
import type { SentenceVerb } from "./sentence/fact-glyphs";

interface SplitDraftArgs {
    categoryId: string | null;
    currency: string;
    db: Database;
    hasAmount: boolean;
    income: boolean;
    initial: Transaction | undefined;
    mode: "create" | "edit";
    onEdit: () => void;
    readAmount: () => number;
    restored: Allocation[] | undefined;
}

// Out of the form store: a split is written after the row exists, like tags, and no validator gates on it.
export function useSplitDraft({
    categoryId,
    currency,
    db,
    hasAmount,
    income,
    initial,
    mode,
    onEdit,
    readAmount,
    restored,
}: SplitDraftArgs) {
    const t = useTranslation();
    const sheetRef = useRef<BottomSheetModal>(null);
    const [edited, setAllocations] = useState<Allocation[] | null>(restored ?? null);

    const stored = useLiveQuery(
        transactionSplits,
        () => (mode === "edit" && initial != null && edited === null ? splitsForQuery(db, initial.id) : NO_READ),
        [db, mode, initial?.id, edited === null]
    );
    const allocations = edited ?? stored.map((row) => ({ amount: row.amount, categoryId: row.categoryId }));
    const minorUnits = minorUnitsFor(currency);

    const line =
        allocations.length === 0
            ? null
            : t("transaction.sentence.extra.split", {
                  parts: t("transaction.split.count", {
                      count: allocations.length,
                  }),
              });

    const verb: SentenceVerb = {
        accessibilityLabel: line ?? undefined,
        active: allocations.length > 0,
        disabled: !hasAmount,
        key: "split",
        label:
            allocations.length === 0
                ? t("transaction.sentence.add.split")
                : t("transaction.sentence.set.split", { count: allocations.length }),
        onPress: () => {
            // A sheet presents over the note's keyboard, not under it.
            Keyboard.dismiss();
            if (allocations.length === 0) {
                setAllocations(openDraft(readAmount(), categoryId, minorUnits));
            }
            sheetRef.current?.present();
        },
    };

    const refusal = (amount: number, entryCurrency: string): string | null => {
        if (isRealSplit(allocations) && !isBalanced(amount, allocations, minorUnitsFor(entryCurrency))) {
            sheetRef.current?.present();
            return t("transaction.split.unbalanced");
        }
        return null;
    };

    const sheet = (total: number) => (
        <SplitSheet
            allocations={allocations}
            code={currency}
            db={db}
            income={income}
            minorUnits={minorUnits}
            onChange={(next) => {
                onEdit();
                setAllocations(next);
            }}
            ref={sheetRef}
            total={total}
        />
    );

    return { allocations, line, refusal, sheet, verb };
}
