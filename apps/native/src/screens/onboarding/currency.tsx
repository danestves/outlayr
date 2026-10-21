import type { BottomSheetModal } from "@expo/ui/community/bottom-sheet";
import { currencyDisplayFor } from "@outlayr/money/currency";
import { useForm, useSelector } from "@tanstack/react-form";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useReducedMotion,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { FirstRun } from "@/components/first-run";
import { holdSubmitting, pressSubmitWith } from "@/components/form/submit-guard";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { finishOnboarding } from "@/data/onboarding-core";
import { setCurrency } from "@/data/settings-core";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { posthog } from "@/lib/posthog";

type CommitKind = "continue" | "finish";

// Typed so the form's submit-meta type is the union, not the default's literal.
const CONTINUE: CommitKind = "continue";
const FINISH: CommitKind = "finish";

const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1);

function CurrencyGlyph({ symbol }: { symbol: string }) {
    const reduced = useReducedMotion();
    const [spun, setSpun] = useState(symbol);
    // Derived, not set from the effect: reduced motion has no edge to swap the glyph at.
    const shown = reduced ? symbol : spun;
    const spin = useSharedValue(0);

    useEffect(() => {
        if (reduced || symbol === shown) {
            return;
        }
        const commit = (next: string) => {
            setSpun(next);
            spin.set(-90);
            spin.set(withTiming(0, { duration: 320, easing: EASE_OUT }));
        };
        spin.set(
            withTiming(90, { duration: 160, easing: Easing.in(Easing.ease) }, (finished) => {
                if (finished) {
                    scheduleOnRN(commit, symbol);
                }
            })
        );
    }, [symbol, shown, reduced, spin]);

    const style = useAnimatedStyle(() => ({
        transform: [{ perspective: 600 }, { rotateY: `${spin.get()}deg` }],
    }));

    return (
        <Animated.View style={style}>
            <Text
                adjustsFontSizeToFit
                className="font-sans-bold text-fr-ink w-56 text-center text-[104px] leading-[116px]"
                numberOfLines={1}
            >
                {shown}
            </Text>
        </Animated.View>
    );
}

/** Continue pushes over this screen, so going back finds it mounted with the CTA still on "Saving…". */
function useHoldUntilRefocused(): () => Promise<void> {
    const release = useRef<(() => void) | null>(null);
    useFocusEffect(
        useCallback(() => {
            release.current?.();
            release.current = null;
        }, [])
    );
    return useCallback(
        () =>
            new Promise<void>((resolve) => {
                release.current = resolve;
            }),
        []
    );
}

export function OnboardingCurrency() {
    const db = useDatabase();
    const router = useRouter();
    const stored = useGlobalCurrency(db);
    const sheet = useRef<BottomSheetModal>(null);
    const t = useTranslation();
    const untilRefocused = useHoldUntilRefocused();

    const [initialValues] = useState<{ picked: string | null }>(() => ({ picked: null }));
    const form = useForm({
        defaultValues: initialValues,
        onSubmit: async ({ value, meta }) => {
            const code = value.picked ?? stored;
            try {
                await setCurrency(db, code);
                if (meta === "continue") {
                    // The root guard does not swap on this write: the AI consent question is next.
                    router.push("/onboarding/smart-features");
                } else {
                    // `finishOnboarding` settles the root guard, which swaps the stack; pushing too would race it.
                    await finishOnboarding(db);
                }
                if (posthog) {
                    posthog.capture("onboarding_currency_saved", { onboarding_path: meta });
                }
                if (meta === "continue") {
                    return await untilRefocused();
                }
                return await holdSubmitting();
            } catch (error) {
                console.error("Failed to save the onboarding currency", error);
                notifyFailure({
                    body: t("onboarding.currency.saveFailed.body"),
                    title: t("onboarding.currency.saveFailed.title"),
                });
            }
        },
        onSubmitMeta: CONTINUE,
    });
    const { picked } = useSelector(form.store, (s) => s.values);
    const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

    const code = picked ?? stored;
    const display = currencyDisplayFor(code);

    return (
        <FirstRun
            action={{
                disabled: isSubmitting,
                label: isSubmitting ? t("onboarding.currency.saving") : t("common.continue"),
                onPress: () => pressSubmitWith(form, CONTINUE),
            }}
            body={t("onboarding.currency.body")}
            eyebrow={t("onboarding.currency.eyebrow")}
            object={<CurrencyGlyph symbol={display.symbol} />}
            skip={{
                label: t("onboarding.currency.shortcut"),
                onPress: () => pressSubmitWith(form, FINISH),
            }}
            title={t("onboarding.currency.title")}
        >
            <Pressable
                accessibilityHint={t("onboarding.currency.openHint")}
                accessibilityRole="button"
                className="border-fr-rule bg-fr-card flex-row items-center gap-3 rounded-2xl border px-4 py-3.5 active:opacity-60"
                onPress={() => sheet.current?.present()}
            >
                <Text className="text-fr-muted text-headline w-8 text-center">{display.symbol}</Text>
                <View className="flex-1 gap-0.5">
                    <Text className="font-sans-semibold text-body text-fr-ink">{code}</Text>
                    <Text className="text-footnote text-fr-muted" numberOfLines={1}>
                        {display.name}
                    </Text>
                </View>
                <MonoLabel className="text-fr-muted">{t("onboarding.currency.change")}</MonoLabel>
            </Pressable>

            <CurrencyPickerSheet
                onSelect={(next) => {
                    form.setFieldValue("picked", next);
                    sheet.current?.dismiss();
                }}
                ref={sheet}
                selected={code}
            />
        </FirstRun>
    );
}
