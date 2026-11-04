import * as Cause from "effect/Cause";
import { useRef, useState } from "react";
import { ScrollView } from "react-native";

import { AmountNumpad } from "@/components/amount-numpad";
import { CategoryIcon } from "@/components/category-icon";
import { FirstRun } from "@/components/first-run";
import { Sentence } from "@/components/sentence/sentence";
import { SentenceValue } from "@/components/sentence/sentence-value";
import { StepCategory } from "@/components/transaction-form/stage/step-category";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useCategoriesByNamespace } from "@/data/categories";
import { useNow } from "@/data/use-now";
import { firstEntryCategory } from "@/domain/first-entry-category";
import { formatAmount, minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { finishOnboardingCommand } from "@/state/lifecycle-commands";
import { saveFirstEntryCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const FAILURE_COPY = {
    finish: "onboarding.firstEntry.finishFailed",
    save: "transaction.save.failedBody",
} as const satisfies Record<string, TranslationKey>;

export function OnboardingFirstEntry() {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const haptics = useHaptics();
    const nowMs = useNow();
    const currency = useGlobalCurrency(db);
    const categories = useCategoriesByNamespace(db, false);
    const [amount, setAmount] = useState("");
    const [pickedId, setPickedId] = useState<string | null>(null);
    const [step, setStep] = useState<"amount" | "category">("amount");
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const [saved, setSaved] = useState(false);
    const [failed, setFailed] = useState<keyof typeof FAILURE_COPY | null>(null);

    const picked = categories.flatMap((parent) => [parent, ...parent.children]).find((row) => row.id === pickedId);
    const category = picked ?? firstEntryCategory(categories, new Date(nowMs).getHours());
    const figure = numpadToNumber(amount);

    const finishFailed = (cause: Cause.Cause<unknown>) => {
        console.error("Finishing onboarding failed", Cause.squash(cause));
        haptics("error");
        setFailed("finish");
    };
    const finishOnboarding = useAtomAction(finishOnboardingCommand, { onFailure: finishFailed }, SILENT);
    const skipOnboarding = useAtomAction(
        finishOnboardingCommand,
        {
            onFailure: finishFailed,
            onSuccess: () => posthog?.capture("onboarding_first_entry", { outcome: "skipped" }),
        },
        SILENT
    );
    const saveFirstEntry = useAtomAction(
        saveFirstEntryCommand,
        {
            onFailure: (cause) => {
                console.error("Saving the first entry failed", Cause.squash(cause));
                savingRef.current = false;
                haptics("error");
                setFailed("save");
            },
            onSettled: () => setSaving(false),
            onSuccess: (written) => {
                savingRef.current = written;
                haptics(written ? "success" : "error");
                setFailed(written ? null : "save");
                setSaved(written);
                if (written) {
                    finishOnboarding(db);
                }
            },
        },
        SILENT
    );

    const save = () => {
        if (category === null || savingRef.current) {
            return;
        }
        savingRef.current = true;
        setSaving(true);
        setFailed(null);
        saveFirstEntry({
            db,
            draft: {
                accountId: null,
                amount: roundToMinorUnits(figure, currency),
                categoryId: category.id,
                currency: null,
                details: null,
                income: false,
                merchant: "",
                schedule: null,
            },
        });
    };

    const later = () => {
        if (saving) {
            return;
        }
        setFailed(null);
        (saved ? finishOnboarding : skipOnboarding)(db);
    };

    return (
        <FirstRun
            action={{
                disabled: figure <= 0 || category === null || saving || saved,
                label: t("common.save"),
                onPress: save,
            }}
            error={failed === null ? null : t(FAILURE_COPY[failed])}
            eyebrow={t("onboarding.firstEntry.eyebrow")}
            skip={{ label: t("onboarding.firstEntry.later"), onPress: later }}
            title={t("onboarding.firstEntry.title")}
        >
            <ScrollView className="shrink grow-0" contentContainerClassName="gap-5">
                <Sentence<"amount" | "category">
                    slots={{
                        amount: (
                            <SentenceValue
                                accessibilityLabel={t("transaction.field.amount")}
                                active={step === "amount"}
                                figure={{ amount: figure, code: currency }}
                                onPress={() => setStep("amount")}
                                swapKey="amount"
                                value={formatAmount(figure, currency, true, language)}
                            />
                        ),
                        category:
                            category === null ? null : (
                                <SentenceValue
                                    accessibilityLabel={t("transaction.field.category")}
                                    active={step === "category"}
                                    onPress={() => setStep("category")}
                                    value={category.name ?? ""}
                                >
                                    <CategoryIcon
                                        color={category.color ?? colors.foreground}
                                        name={category.icon}
                                        size={20}
                                    />
                                </SentenceValue>
                            ),
                    }}
                    template={t("onboarding.firstEntry.sentence")}
                />
                {step === "category" ? (
                    <StepCategory
                        categories={categories}
                        onSelect={(next) => {
                            setPickedId(next.id);
                            setStep("amount");
                        }}
                        selectedId={category?.id ?? null}
                    />
                ) : (
                    <AmountNumpad
                        code={currency}
                        minorUnits={minorUnitsFor(currency)}
                        onChange={setAmount}
                        showDisplay={false}
                        value={amount}
                    />
                )}
            </ScrollView>
        </FirstRun>
    );
}
