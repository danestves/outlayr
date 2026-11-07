import { BottomSheetModal, BottomSheetTextInput, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import * as Effect from "effect/Effect";
import { Image } from "expo-image";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Pressable, View } from "react-native";

import { websiteDomain } from "@/domain/merchant-website";
import { useSheetSurface } from "@/hooks/use-sheet-surface";
import { useTranslation } from "@/i18n/context";
import { discardStoredPhoto, voidAppFlowCommand } from "@/state/entry-commands";
import { useAtomCommand } from "@/state/use-atom-command";
import { useColors } from "@/theme/use-colors";

import { SheetGestureRoot } from "../sheet-gesture-root";
import { ROUNDED, Text } from "../text";
import { checkMerchantWebsite } from "./entry-flows";
import type { MerchantWebsiteLogo } from "./entry-flows";

const CHECK_DELAY_MS = 800;
const FIT_CONTENT = { alignSelf: "stretch" } as const;
const PREVIEW_SIZE = 44;

type Check = { kind: "checking" | "idle" | "missing" } | { kind: "found"; logo: MerchantWebsiteLogo };

interface MerchantWebsiteSheetProps {
    merchant: string;
    onUse: (logo: MerchantWebsiteLogo) => void;
    ref: RefObject<BottomSheetModal | null>;
}

export function MerchantWebsiteSheet({ merchant, onUse, ref }: MerchantWebsiteSheetProps) {
    const t = useTranslation();
    const colors = useColors();
    const sheetSurface = useSheetSurface();
    const runFlow = useAtomCommand(voidAppFlowCommand);
    const [address, setAddress] = useState("");
    const [check, setCheck] = useState<Check>({ kind: "idle" });
    const ticket = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const preview = useRef<string | null>(null);

    const release = () => {
        if (preview.current !== null) {
            discardStoredPhoto(preview.current);
            preview.current = null;
        }
    };

    const cancelCheck = () => {
        ticket.current += 1;
        if (timer.current !== null) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    };

    const changeAddress = (next: string) => {
        setAddress(next);
        cancelCheck();
        release();
        const domain = websiteDomain(next);
        if (domain === null) {
            setCheck({ kind: "idle" });
            return;
        }
        setCheck({ kind: "checking" });
        const asked = ticket.current;
        timer.current = setTimeout(() => {
            void runFlow(
                checkMerchantWebsite(domain, merchant).pipe(
                    Effect.flatMap((logo) =>
                        Effect.sync(() => {
                            if (asked !== ticket.current) {
                                if (logo !== null) {
                                    discardStoredPhoto(logo.photoUri);
                                }
                                return;
                            }
                            preview.current = logo?.photoUri ?? null;
                            setCheck(logo === null ? { kind: "missing" } : { kind: "found", logo });
                        })
                    )
                )
            );
        }, CHECK_DELAY_MS);
    };

    const use = () => {
        if (check.kind !== "found") {
            return;
        }
        preview.current = null;
        onUse(check.logo);
        ref.current?.dismiss();
    };

    const reset = () => {
        cancelCheck();
        release();
        setAddress("");
        setCheck({ kind: "idle" });
    };

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            onDismiss={reset}
            ref={ref}
        >
            <BottomSheetView style={{ paddingBottom: 24 }}>
                <SheetGestureRoot style={FIT_CONTENT}>
                    <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => ref.current?.dismiss()}>
                            <Text className="text-tint text-body">{t("common.cancel")}</Text>
                        </Pressable>
                        <Text
                            accessibilityRole="header"
                            className="text-foreground font-sans-semibold text-body flex-1 px-3 text-center"
                            numberOfLines={1}
                        >
                            {merchant}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ disabled: check.kind !== "found" }}
                            disabled={check.kind !== "found"}
                            hitSlop={8}
                            onPress={use}
                        >
                            <Text
                                className={
                                    check.kind === "found"
                                        ? "text-tint font-sans-semibold text-body"
                                        : "text-muted font-sans-semibold text-body"
                                }
                            >
                                {t("transaction.website.use")}
                            </Text>
                        </Pressable>
                    </View>
                    <View className="px-5">
                        <View className="bg-surface rounded-[14px]">
                            <BottomSheetTextInput
                                accessibilityLabel={t("transaction.website.field")}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoFocus
                                keyboardType="url"
                                onChangeText={changeAddress}
                                placeholder={t("transaction.website.placeholder")}
                                placeholderTextColor={colors.muted}
                                returnKeyType="done"
                                style={{
                                    color: colors.foreground,
                                    fontFamily: ROUNDED,
                                    fontSize: 16,
                                    height: 46,
                                    paddingHorizontal: 14,
                                }}
                                value={address}
                            />
                        </View>
                        <View accessibilityLiveRegion="polite" className="min-h-14 flex-row items-center gap-3 pt-3">
                            {check.kind === "found" ? (
                                <Image
                                    accessibilityIgnoresInvertColors
                                    source={{ uri: check.logo.photoUri }}
                                    style={{ borderRadius: 10, height: PREVIEW_SIZE, width: PREVIEW_SIZE }}
                                />
                            ) : null}
                            <View className="flex-1">
                                {check.kind === "found" ? (
                                    <Text className="text-foreground font-sans-semibold text-body">
                                        {t("transaction.website.found")}
                                    </Text>
                                ) : null}
                                {check.kind === "checking" ? (
                                    <Text className="text-muted text-footnote">
                                        {t("transaction.website.checking")}
                                    </Text>
                                ) : null}
                                {check.kind === "missing" ? (
                                    <Text className="text-danger text-footnote">
                                        {t("transaction.website.missing")}
                                    </Text>
                                ) : null}
                                {check.kind === "found" || check.kind === "idle" ? (
                                    <Text className="text-muted text-footnote">
                                        {t("transaction.website.shared", { merchant })}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    </View>
                </SheetGestureRoot>
            </BottomSheetView>
        </BottomSheetModal>
    );
}
