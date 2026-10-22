import { BottomSheetModal, BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { useCallback, useRef } from "react";
import type { Ref } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { cn } from "@/components/tw";
import { useBankAccounts } from "@/data/accounts";
import type { Account } from "@/data/accounts-core";
import type { Database } from "@/db/client";
import { useMergedRef } from "@/hooks/use-merged-ref";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryIconTile } from "./category-icon-tile";
import { Text } from "./text";

// One snap point opens Android's Compose sheet fully expanded, so it gets a taller second one to rest below.
const SNAP_POINTS = Platform.OS === "android" ? ["50%", "92%"] : ["50%"];
// Resting at half height, Android shows the sheet's top, so a centred empty state would sit below the fold.
const EMPTY_ALIGN = Platform.OS === "android" ? "pt-10" : "justify-center";

interface AccountPickerSheetProps {
    allowNone?: boolean;
    db: Database;
    noneLabel?: string;
    onCreate: () => void;
    /** Fires on a swipe-dismiss too, so a presenter can undo whatever it did to open this. */
    onDismiss?: () => void;
    onSelect: (account: Account | null) => void;
    ref?: Ref<BottomSheetModal>;
    selectedId: string | null;
}

export function AccountPickerSheet({
    db,
    selectedId,
    onSelect,
    onCreate,
    ref,
    allowNone = true,
    noneLabel,
    onDismiss,
}: AccountPickerSheetProps) {
    const t = useTranslation();
    const colors = useColors();
    const sheetSurface = useSheetSurface(colors.surfaceSecondary);
    const accounts = useBankAccounts(db);
    const sheetRef = useRef<BottomSheetModal>(null);

    const setRefs = useMergedRef(sheetRef, ref);

    const pick = useCallback(
        (account: Account | null) => {
            onSelect(account);
            sheetRef.current?.dismiss();
        },
        [onSelect]
    );

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing={false}
            enablePanDownToClose
            onDismiss={onDismiss}
            ref={setRefs}
            snapPoints={SNAP_POINTS}
        >
            <SheetGestureRoot fill>
                <View className="h-11 justify-center px-4">
                    <Text
                        accessibilityRole="header"
                        className="font-sans-semibold text-callout text-foreground text-center"
                    >
                        {t("transaction.account.title")}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        className="absolute top-0 right-4 bottom-0 justify-center active:opacity-60"
                        hitSlop={8}
                        onPress={() => sheetRef.current?.dismiss()}
                    >
                        <Text className="font-sans-semibold text-callout text-tint">{t("common.done")}</Text>
                    </Pressable>
                </View>

                {accounts.length === 0 ? (
                    <View className={cn("flex-1 items-center gap-4 px-8 pb-16", EMPTY_ALIGN)}>
                        <Text className="text-callout text-muted text-center">{t("transaction.account.empty")}</Text>
                        <Pressable
                            accessibilityRole="button"
                            className="active:opacity-60"
                            hitSlop={8}
                            onPress={onCreate}
                        >
                            <Text className="font-sans-semibold text-callout text-tint">
                                {t("transaction.account.create")}
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <BottomSheetScrollView
                        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                    >
                        <View className="bg-surface overflow-hidden rounded-xl">
                            {allowNone ? (
                                <AccountRow
                                    account={null}
                                    noneLabel={noneLabel ?? t("transaction.account.none")}
                                    onPick={pick}
                                    selected={selectedId === null}
                                />
                            ) : null}
                            {accounts.map((account, index) => (
                                <View key={account.id}>
                                    {allowNone || index > 0 ? (
                                        <View
                                            className="ml-[58px]"
                                            style={{
                                                backgroundColor: withAlpha(colors.foreground, 0.07),
                                                height: StyleSheet.hairlineWidth,
                                            }}
                                        />
                                    ) : null}
                                    <AccountRow
                                        account={account}
                                        noneLabel=""
                                        onPick={pick}
                                        selected={account.id === selectedId}
                                    />
                                </View>
                            ))}
                        </View>
                    </BottomSheetScrollView>
                )}
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}

function AccountRow({
    account,
    noneLabel,
    selected,
    onPick,
}: {
    account: Account | null;
    noneLabel: string;
    selected: boolean;
    onPick: (account: Account | null) => void;
}) {
    const colors = useColors();
    const tint = account == null ? colors.muted : (account.imageColor ?? account.customColor ?? colors.foreground);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className="flex-row items-center gap-3 py-[11px] pr-3.5 pl-3.5 active:opacity-60"
            onPress={() => onPick(account)}
        >
            <CategoryIconTile
                color={tint}
                emoji={account?.emoji ?? null}
                icon={account?.icon ?? null}
                imageUri={account?.imageUri ?? null}
                size={28}
                type={selected ? "solid" : "stroke"}
            />
            <View className="flex-1">
                <Text className="font-sans-medium text-callout text-foreground" numberOfLines={1}>
                    {account?.name ?? noneLabel}
                </Text>
                {account ? (
                    <Text className="text-footnote text-muted" numberOfLines={1}>
                        {account.currency}
                    </Text>
                ) : null}
            </View>
            {selected ? <Text className="font-sans-bold text-income text-subtitle">✓</Text> : null}
        </Pressable>
    );
}
