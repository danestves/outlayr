import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import ArrowLeft01Icon from "@hugeicons-pro/core-stroke-rounded/ArrowLeft01Icon";
import Cancel01Icon from "@hugeicons-pro/core-stroke-rounded/Cancel01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { toAccountKind } from "@outlayr/money/account-kind";
import * as Cause from "effect/Cause";
import { Button } from "panelui-native/components/button";
import { useState } from "react";
import type { Ref } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { AmountNumpad } from "@/components/amount-numpad";
import { HeroNumber } from "@/components/amount-text";
import { InlineFailure } from "@/components/form/inline-failure";
import { GrowToContent } from "@/components/import-sheet/grow-to-content";
import { MonoLabel } from "@/components/mono-label";
import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDatabase } from "@/contexts/local-data-context";
import type { Account } from "@/data/accounts-core";
import { formatSignedAmount } from "@/domain/account-display";
import { balanceDifference } from "@/domain/balance-check";
import { minorUnitsFor } from "@/domain/money";
import { numpadToNumber } from "@/domain/numpad";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";
import { SheetCommitButton } from "@/screens/budgets/components/sheet-commit-button";
import { checkBalanceCommand } from "@/state/accounts-commands";
import { SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";

interface CheckBalanceSheetProps {
    account: Account;
    /** Signed, as the account shows it: a charged card is negative. */
    balance: number;
    onClose: () => void;
    ref?: Ref<BottomSheetModal>;
}

const SHEET_HEIGHT_SHARE = 0.9;

export function CheckBalanceSheet({ account, balance, onClose, ref }: CheckBalanceSheetProps) {
    const sheetSurface = useSheetSurface();
    const [presentation, setPresentation] = useState(0);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => setPresentation((count) => count + 1)}
            ref={ref}
        >
            <SheetGestureRoot style={{}}>
                <BottomSheetView style={{ paddingBottom: 28 }}>
                    {/* A dismissed draft must not be what the next presentation opens on. */}
                    <CheckBody account={account} balance={balance} key={presentation} onClose={onClose} />
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

function CheckBody({ account, balance, onClose }: Omit<CheckBalanceSheetProps, "ref">) {
    const db = useDatabase();
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const { height } = useWindowDimensions();
    const { currency } = account;
    const liability = toAccountKind(account.kind) === "liability";
    const minorUnits = minorUnitsFor(currency);
    const [fixing, setFixing] = useState(false);
    const [entry, setEntry] = useState("");
    const [negative, setNegative] = useState(balance < 0 || (liability && balance === 0));
    const [typed, setTyped] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);

    const magnitude = numpadToNumber(entry);
    const difference = balanceDifference(balance, negative ? -magnitude : magnitude, currency);
    const money = (value: number) => formatSignedAmount(value, currency, true, language);

    const checkBalance = useAtomAction(
        checkBalanceCommand,
        {
            onFailure: (cause) => {
                console.error("Failed to check the balance", Cause.squash(cause));
                haptics("error");
                setFailure(t("accounts.error.saveFailed"));
                setBusy(false);
            },
            onSuccess: () => {
                haptics("success");
                onClose();
            },
        },
        SILENT
    );

    const commit = (next: number) => {
        if (busy) {
            return;
        }
        setBusy(true);
        setFailure(null);
        checkBalance({ account, db, difference: next, note: t("accounts.check.note") });
    };

    return (
        <View>
            <SheetBar
                onBack={fixing ? () => setFixing(false) : undefined}
                onClose={onClose}
                title={t("accounts.check.title", { account: account.name })}
            />
            <GrowToContent maxHeight={height * SHEET_HEIGHT_SHARE}>
                {fixing ? (
                    <View className="px-5 pt-4">
                        <MonoLabel>{t("accounts.check.shows", { account: account.name })}</MonoLabel>
                        <View className="flex-row items-center pt-1 pb-4">
                            <Pressable
                                accessibilityLabel={t("accounts.a11y.balanceSign")}
                                accessibilityRole="button"
                                className="h-11 w-8 items-center justify-center active:opacity-70"
                                onPress={() => setNegative((value) => !value)}
                            >
                                <Text className={cn("text-title", negative ? "text-tint" : "text-muted")}>
                                    {negative ? "−" : "+"}
                                </Text>
                            </Pressable>
                            <HeroNumber amount={magnitude} code={currency} sign="" still />
                        </View>
                        <View className="border-border border-t">
                            <View className="border-border flex-row items-center justify-between border-b py-3">
                                <Text className="text-body text-muted">{t("accounts.check.has")}</Text>
                                <Text className="text-body text-foreground tabular-nums">{money(balance)}</Text>
                            </View>
                            <View className="flex-row items-center justify-between py-3">
                                <Text className="text-body text-muted">{t("accounts.check.adjustment")}</Text>
                                <Text className="font-sans-semibold text-body text-foreground tabular-nums">
                                    {money(difference)}
                                </Text>
                            </View>
                        </View>
                        <View className="pt-3">
                            <AmountNumpad
                                code={currency}
                                minorUnits={minorUnits}
                                onChange={(next) => {
                                    setTyped(true);
                                    setEntry(next);
                                }}
                                showDisplay={false}
                                value={entry}
                            />
                        </View>
                        <View className="pt-4">
                            <InlineFailure message={failure} />
                            <SheetCommitButton
                                busy={busy}
                                disabled={!typed}
                                label={
                                    difference === 0
                                        ? t("accounts.check.markChecked")
                                        : t("accounts.check.log", { amount: money(difference) })
                                }
                                onPress={() => commit(difference)}
                            />
                        </View>
                    </View>
                ) : (
                    <View className="px-5 pt-4">
                        <View className="items-center gap-1 pb-6">
                            <MonoLabel>{t("accounts.check.eyebrow")}</MonoLabel>
                            <HeroNumber amount={balance} code={currency} sign={balance < 0 ? "-" : ""} still />
                            <Text className="text-body text-muted text-center">{t("accounts.check.compare")}</Text>
                        </View>
                        <InlineFailure message={failure} />
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ busy, disabled: busy }}
                            className="bg-foreground h-14 items-center justify-center rounded-[28px] active:opacity-70"
                            disabled={busy}
                            onPress={() => commit(0)}
                        >
                            <Text className="font-sans-semibold text-background text-callout">
                                {t("accounts.check.matches")}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            className="bg-surface mt-2 h-14 items-center justify-center rounded-[28px] active:opacity-70"
                            disabled={busy}
                            onPress={() => setFixing(true)}
                        >
                            <Text className="font-sans-semibold text-foreground text-callout">
                                {t("accounts.check.differs")}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </GrowToContent>
        </View>
    );
}

function SheetBar({ onBack, onClose, title }: { onBack?: () => void; onClose: () => void; title: string }) {
    const t = useTranslation();

    return (
        <View className="flex-row items-center px-5 py-2">
            <View className="absolute inset-0 items-center justify-center px-16" pointerEvents="none">
                <Text
                    accessibilityRole="header"
                    className="text-foreground text-headline font-medium"
                    numberOfLines={1}
                >
                    {title}
                </Text>
            </View>
            {onBack ? (
                <Button
                    accessibilityLabel={t("common.back")}
                    className="rounded-full"
                    onPress={onBack}
                    size="icon"
                    variant="secondary"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={22} />
                </Button>
            ) : null}
            <View className="ml-auto">
                <Button
                    accessibilityLabel={t("common.close")}
                    className="rounded-full"
                    onPress={onClose}
                    size="icon"
                    variant="secondary"
                >
                    <HugeiconsIcon icon={Cancel01Icon} size={22} />
                </Button>
            </View>
        </View>
    );
}
