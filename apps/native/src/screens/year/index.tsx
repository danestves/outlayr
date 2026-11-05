import { addDays } from "@outlayr/money/calendar";
import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { Linking, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HeroNumber } from "@/components/amount-text";
import { CloseToolbar } from "@/components/close-toolbar";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useGlobalCurrency } from "@/data/app-meta";
import { useYearSavings } from "@/data/use-month-savings";
import { useNow } from "@/data/use-now";
import { formatChargeDate, formatTargetMonth } from "@/domain/dates";
import { formatAmount, formatFixed } from "@/domain/money";
import { YEAR_MONTHS } from "@/domain/month-savings";
import { listNames } from "@/domain/savings-names";
import { YEAR_SHEET_LEAD_DAYS } from "@/domain/year-sheet";
import { useHeldSubscription } from "@/hooks/use-held-subscription";
import { useLanguage, useTranslation } from "@/i18n/context";
import { expectHandoff } from "@/lib/app-handoff";
import { SavingsBar, SavingsRow, SavingsSection } from "@/screens/recap/savings-rows";

const PREVIEW_PRICE = 49.99;

export function Year({ preview }: { preview: boolean }) {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const { language } = useLanguage();
    const { bottom } = useSafeAreaInsets();
    const { showCents } = useDisplaySettings().state;
    const currency = useGlobalCurrency(db);
    const nowMs = useNow();
    const year = useYearSavings(db, nowMs);
    const held = useHeldSubscription();
    const now = new Date(nowMs);

    const stored =
        held?.plan.kind === "annual" && held.status.kind === "renews"
            ? {
                  currency: held.plan.offer.product.currencyCode,
                  manageUrl: held.manageUrl,
                  price: held.plan.offer.product.price,
                  priceString: held.plan.priceString,
                  renewsOn: held.status.on,
              }
            : null;
    const annual =
        stored ??
        (__DEV__ && preview
            ? {
                  currency,
                  manageUrl: null,
                  price: PREVIEW_PRICE,
                  priceString: formatAmount(PREVIEW_PRICE, currency, true, language),
                  renewsOn: addDays(now, YEAR_SHEET_LEAD_DAYS - 2),
              }
            : null);

    if (annual === null) {
        return <CloseToolbar placement="left" />;
    }

    const money = (amount: number) => formatAmount(amount, currency, showCents, language);
    const { manageUrl } = annual;

    return (
        <>
            <CloseToolbar placement="left" />
            <View className="bg-background flex-1">
                <ScrollView
                    contentContainerClassName="px-5 pt-6 pb-6"
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={false}
                >
                    <MonoLabel>
                        {t("pro.year.range", {
                            from: formatTargetMonth(year.from, language),
                            to: formatTargetMonth(year.to, language),
                        })}
                    </MonoLabel>
                    <View className="pt-0.5">
                        <HeroNumber
                            amount={year.kept}
                            brandFace
                            code={currency}
                            showCents={showCents}
                            sign=""
                            size={40}
                        />
                    </View>
                    <Text className="text-footnote text-muted pt-0.5">{t("pro.year.keptLine")}</Text>

                    {annual.currency === currency ? (
                        <View className="pt-5">
                            <SavingsBar kept={year.kept} price={annual.price} />
                            <View className="flex-row items-baseline justify-between pt-2">
                                <MonoLabel className="text-income">
                                    {t("pro.year.keptLabel", { amount: money(year.kept) })}
                                </MonoLabel>
                                <MonoLabel className="text-foreground">
                                    {t("pro.year.proLabel", { price: annual.priceString })}
                                </MonoLabel>
                            </View>
                        </View>
                    ) : null}

                    <View className="pt-6">
                        <SavingsSection label={t("pro.year.months")} title={t("pro.year.monthByMonth")}>
                            <SavingsRow
                                figure={t("pro.year.outOf", { count: year.monthsUnder, total: YEAR_MONTHS })}
                                label={t("pro.year.underBudget")}
                                tone="foreground"
                            />
                            {year.belowAverage > 0 ? (
                                <SavingsRow
                                    detail={listNames(year.belowNames, t)}
                                    figure={money(year.belowAverage)}
                                    label={t("pro.year.below")}
                                />
                            ) : null}
                            <SavingsRow
                                figure={formatFixed(year.entries, 0, language)}
                                label={t("pro.year.entries")}
                                tone="foreground"
                            />
                        </SavingsSection>
                    </View>

                    <Text className="text-footnote text-muted pt-4">
                        {t("pro.year.renews", {
                            date: formatChargeDate(annual.renewsOn, now, language),
                            price: annual.priceString,
                        })}
                    </Text>
                </ScrollView>
                <View className="gap-2.5 px-5 pt-2" style={{ paddingBottom: Math.max(bottom, 16) }}>
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() => router.back()}
                        size="md"
                        variant="primary"
                    >
                        {t("pro.year.keep")}
                    </Button>
                    {manageUrl === null ? null : (
                        <Button
                            className="rounded-full"
                            fullWidth
                            onPress={() => {
                                expectHandoff();
                                Linking.openURL(manageUrl);
                            }}
                            size="md"
                            variant="secondary"
                        >
                            {t("pro.year.manage")}
                        </Button>
                    )}
                </View>
            </View>
        </>
    );
}
