import * as Cause from "effect/Cause";
import { useState } from "react";
import { View } from "react-native";

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
import { useLanguage, useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { finishOnboardingCommand } from "@/state/lifecycle-commands";
import { saveFirstEntryCommand } from "@/state/onboarding-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

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
    const [saved, setSaved] = useState(false);
    const [failed, setFailed] = useState(false);

    const picked = categories.flatMap((parent) => [parent, ...parent.children]).find((row) => row.id === pickedId);
    const category = picked ?? firstEntryCategory(categories, new Date(nowMs).getHours());
    const figure = numpadToNumber(amount);

    const finishOnboarding = useAtomAction(
        finishOnboardingCommand,
        { onFailure: (cause) => console.error("Finishing onboarding failed", Cause.squash(cause)) },
        SILENT
    );
    const saveFirstEntry = useAtomAction(
        saveFirstEntryCommand,
        {
            onFailure: (cause) => {
                console.error("Saving the first entry failed", Cause.squash(cause));
                haptics("error");
                setFailed(true);
            },
            onSettled: () => setSaving(false),
            onSuccess: (written) => {
                haptics(written ? "success" : "error");
                setFailed(!written);
                setSaved(written);
                if (written) {
                    finishOnboarding(db);
                }
            },
        },
        SILENT
    );

    const save = () => {
        if (category === null) {
            return;
        }
        setSaving(true);
        setFailed(false);
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
        if (!saved) {
            posthog?.capture("onboarding_first_entry", { outcome: "skipped" });
        }
        finishOnboarding(db);
    };

    return (
        <FirstRun
            action={{
                disabled: figure <= 0 || category === null || saving || saved,
                label: t("common.save"),
                onPress: save,
            }}
            error={failed ? t("transaction.save.failedBody") : null}
            eyebrow={t("onboarding.firstEntry.eyebrow")}
            skip={{ label: t("onboarding.firstEntry.later"), onPress: later }}
            title={t("onboarding.firstEntry.title")}
        >
            <View className="gap-5">
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
            </View>
        </FirstRun>
    );
}
