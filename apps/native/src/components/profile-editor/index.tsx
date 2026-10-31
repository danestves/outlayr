import { Host } from "@expo/ui";
import { ScrollView, useNativeState, VStack } from "@expo/ui/swift-ui";
import { animation, blur, opacity, overlay, padding, scrollDismissesKeyboard } from "@expo/ui/swift-ui/modifiers";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CurrencyPickerSheet } from "@/components/currency-picker-sheet";
import { EditorCta } from "@/components/editor-cta";
import { EditorHeroBand } from "@/components/editor-hero-band";
import {
    CTA_BOTTOM_PADDING,
    CTA_HEIGHT,
    FLY_BACK,
    FLY_UP,
    FORM_BLUR_RADIUS,
    FORM_TOP_MARGIN,
    HEADER_HEIGHT,
    HERO_BOTTOM_PADDING,
    HERO_TOP_PADDING,
} from "@/components/editor-style";
import { InlineFailure } from "@/components/form/inline-failure";
import { IdentityCurtain } from "@/components/identity-curtain";
import { HERO_RING, IdentityFlyUpLayer } from "@/components/identity-fly-up";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useKeyboardEvent } from "@/hooks/use-keyboard-height";
import { useTranslation } from "@/i18n/context";
import { ACCOUNT_DETENT, LARGE_ONLY } from "@/lib/sheet-detents";
import { glowFromEmoji } from "@/theme/glow";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { ProfileDetailsSection } from "./details-section";
import { useProfileForm } from "./use-profile-form";
import type { ProfileEditorMode } from "./use-profile-form";

export default function ProfileEditor({ mode }: { mode: ProfileEditorMode }) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [ctaHeight, setCtaHeight] = useState(CTA_HEIGHT);
    const {
        busy,
        canSave,
        currencySheet,
        deleteProfile,
        draft,
        failure,
        fields,
        floatProgress,
        name,
        openPicker,
        pickerOpen,
        resetIdentity,
        submit,
        tint,
    } = useProfileForm(mode);
    const nameState = useNativeState(name);

    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HEADER_HEIGHT + HERO_TOP_PADDING);
    const [heroBand, setHeroBand] = useState(HEADER_HEIGHT + HERO_TOP_PADDING + HERO_RING + HERO_BOTTOM_PADDING);

    const keyboardLift = useSharedValue(0);
    useKeyboardEvent("keyboardWillShow", (event) => {
        keyboardLift.set(
            withTiming(Math.max(0, event.endCoordinates.height - insets.bottom), { duration: event.duration })
        );
    });
    useKeyboardEvent("keyboardWillHide", (event) => {
        keyboardLift.set(withTiming(0, { duration: event.duration }));
    });
    const ctaStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -keyboardLift.get() }] }));

    const symbolEmpty = !(draft.icon || draft.emoji || draft.photoUri);
    let curtainHues: string[] | null = null;
    if (!symbolEmpty) {
        curtainHues = draft.emoji && !draft.photoUri ? [...glowFromEmoji(draft.emoji).slice(0, 2), tint] : [tint];
    }

    const underPicker = [
        opacity(pickerOpen ? 0 : 1),
        blur(pickerOpen ? FORM_BLUR_RADIUS : 0),
        animation(pickerOpen ? FLY_UP : FLY_BACK, pickerOpen),
    ];

    return (
        <View
            onLayout={(e) => {
                containerHeight.set(e.nativeEvent.layout.height);
            }}
            style={{ backgroundColor: colors.groupedBackground, flex: 1 }}
        >
            <Stack.Screen options={{ sheetAllowedDetents: pickerOpen ? LARGE_ONLY : [ACCOUNT_DETENT, 1] }} />
            {deleteProfile == null ? null : (
                <Stack.Toolbar placement="right">
                    <Stack.Toolbar.Button
                        accessibilityLabel={t("common.delete")}
                        onPress={deleteProfile}
                        tintColor={colors.danger}
                    >
                        <Stack.Toolbar.Icon {...toolbarIcon("delete")} />
                    </Stack.Toolbar.Button>
                </Stack.Toolbar>
            )}

            <IdentityCurtain hues={curtainHues} />

            <View
                style={{
                    flex: 1,
                    paddingBottom: ctaHeight + CTA_BOTTOM_PADDING + insets.bottom,
                    paddingTop: heroBand,
                }}
            >
                <Host style={{ flex: 1 }}>
                    <ScrollView modifiers={[scrollDismissesKeyboard("interactively"), ...underPicker]}>
                        <VStack modifiers={[padding({ horizontal: 20, top: FORM_TOP_MARGIN })]} spacing={0}>
                            <ProfileDetailsSection
                                {...fields}
                                hairline={[overlay({ color: withAlpha(colors.foreground, 0.08) })]}
                                mutedColor={colors.muted}
                                nameState={nameState}
                                tintColor={colors.foreground}
                            />
                        </VStack>
                    </ScrollView>
                </Host>
            </View>

            <EditorHeroBand
                captionClearance={0}
                income={false}
                color={tint}
                emoji={draft.emoji}
                floatProgress={floatProgress}
                icon={draft.icon}
                onLayout={(e) => setHeroBand(e.nativeEvent.layout.height)}
                onPress={openPicker}
                onReset={resetIdentity}
                photoUri={draft.photoUri}
                variant="transaction"
            />

            <Animated.View
                className="bottom-safe-offset-2 absolute right-0 left-0 px-5"
                pointerEvents={pickerOpen ? "none" : "box-none"}
                style={[ctaStyle, { opacity: pickerOpen ? 0 : 1 }]}
            >
                <InlineFailure message={failure} />

                <View onLayout={(event) => setCtaHeight(event.nativeEvent.layout.height)}>
                    <EditorCta
                        busy={busy}
                        canSave={canSave}
                        label={t(mode === "create" ? "profiles.create" : "common.save")}
                        onPress={submit}
                    />
                </View>
            </Animated.View>

            <CurrencyPickerSheet {...currencySheet} />

            <IdentityFlyUpLayer
                color={tint}
                containerHeight={containerHeight}
                emoji={draft.emoji}
                icon={draft.icon}
                income={false}
                onDismiss={router.back}
                photoUri={draft.photoUri}
                restTop={heroRestTop}
                variant="transaction"
            />
        </View>
    );
}
