import { Host } from "@expo/ui";
import { ScrollView, useNativeState, VStack } from "@expo/ui/swift-ui";
import type { TextFieldRef } from "@expo/ui/swift-ui";
import { animation, blur, opacity, overlay, padding, scrollDismissesKeyboard } from "@expo/ui/swift-ui/modifiers";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useDerivedValue, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EditorCta } from "@/components/editor-cta";
import { EditorHeroBand } from "@/components/editor-hero-band";
import {
    CAPTION_CLEARANCE,
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
import { IdentityCurtain } from "@/components/identity-curtain";
import { HERO_RING, IdentityFlyUpLayer } from "@/components/identity-fly-up";
import { Text } from "@/components/text";
import { useTranslation } from "@/i18n/context";
import { CATEGORY_DETENT, LARGE_ONLY, SUBCATEGORY_DETENT } from "@/lib/sheet-detents";
import { glowFromEmoji } from "@/theme/glow";
import { withAlpha } from "@/theme/shade";
import { useColors } from "@/theme/use-colors";

import { CategoryEditorDetailsSection } from "./details-section";
import { useCategoryForm } from "./use-category-form";
import type { CategoryEditorProps } from "./use-category-form";

export default function CategoryEditor(props: CategoryEditorProps) {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [ctaHeight, setCtaHeight] = useState(CTA_HEIGHT);
    const nameRef = useRef<TextFieldRef>(null);
    const {
        canSave,
        ctaLabel,
        draft,
        fields,
        floatProgress,
        income,
        isSubcategory,
        isSubmitting,
        name,
        openPicker,
        pickerOpen,
        resetIdentity,
        showToast,
        submit,
        symbolEmpty,
        tint,
    } = useCategoryForm(props, { clear: () => nameState.set(""), ref: nameRef });
    const nameState = useNativeState(name);

    // A shared value: only the fly-up reads it, from the UI thread, so measuring costs the form no render.
    const containerHeight = useSharedValue(0);
    const heroRestTop = useDerivedValue(() => HEADER_HEIGHT + HERO_TOP_PADDING);
    // Measured, not derived: it turns on the caption's rendered line height, and the caption comes and goes.
    const [heroBand, setHeroBand] = useState(HEADER_HEIGHT + HERO_TOP_PADDING + HERO_RING + HERO_BOTTOM_PADDING);

    const captionClearance = symbolEmpty ? CAPTION_CLEARANCE : 0;
    const symbolHues = draft.emoji ? [...glowFromEmoji(draft.emoji).slice(0, 2), tint] : [tint];
    const curtainHues = symbolEmpty ? null : symbolHues;

    // Not a shared wrapper stack: a `Form` one level deeper is proposed no height and collapses with every row.
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
            style={{
                backgroundColor: colors.groupedBackground,
                flex: 1,
            }}
        >
            {/* Grows to `.large` before the picker: over the medium detent it would cover the hero the fly-up lands on.
                Also where a subcategory opens shorter, since only the editor resolves the parent. */}
            <Stack.Screen
                options={{
                    sheetAllowedDetents: pickerOpen
                        ? LARGE_ONLY
                        : [isSubcategory ? SUBCATEGORY_DETENT : CATEGORY_DETENT, 1],
                }}
            />

            {/* First, so it paints under the form, whose own background is hidden. */}
            <IdentityCurtain hues={curtainHues} />

            {/* The `Form` must be its host's only child or it collapses, so the hero and CTA are RN views over this
                padding, set here because under `useViewportSizeMeasurement` the host ignores its own. */}
            <View
                style={{
                    flex: 1,
                    paddingBottom: ctaHeight + CTA_BOTTOM_PADDING + insets.bottom,
                    paddingTop: heroBand,
                }}
            >
                <Host style={{ flex: 1 }}>
                    <ScrollView
                        modifiers={[
                            // The CTA sits under the keyboard, so a drag has to be able to put it away.
                            scrollDismissesKeyboard("immediately"),
                            ...underPicker,
                        ]}
                    >
                        <VStack modifiers={[padding({ horizontal: 20, top: FORM_TOP_MARGIN })]} spacing={0}>
                            <CategoryEditorDetailsSection
                                {...fields}
                                dangerColor={colors.danger}
                                hairline={[overlay({ color: withAlpha(colors.foreground, 0.08) })]}
                                mutedColor={colors.muted}
                                nameFieldRef={nameRef}
                                nameState={nameState}
                                tintColor={colors.foreground}
                            />
                        </VStack>
                    </ScrollView>
                </Host>
            </View>

            {/* After the `Host`, so the header's scroll-edge lookup finds the form first. */}
            <EditorHeroBand
                captionClearance={captionClearance}
                color={tint}
                emoji={draft.emoji}
                floatProgress={floatProgress}
                icon={draft.icon}
                income={income}
                onLayout={(e) => setHeroBand(e.nativeEvent.layout.height)}
                onPress={openPicker}
                onReset={resetIdentity}
                photoUri={null}
                variant="category"
            />

            {/* SwiftUI's blur and opacity cannot reach this RN view, so it hides on the wrapper. */}
            <View
                className="bottom-safe-offset-2 absolute right-0 left-0 px-5"
                pointerEvents={pickerOpen ? "none" : "box-none"}
                style={{ opacity: pickerOpen ? 0 : 1 }}
            >
                <View onLayout={(event) => setCtaHeight(event.nativeEvent.layout.height)}>
                    <EditorCta busy={isSubmitting} canSave={canSave} label={ctaLabel} onPress={submit} />
                </View>
            </View>

            {showToast ? (
                <Animated.View
                    className="bottom-safe-offset-5 absolute right-0 left-0 items-center"
                    entering={FadeInDown.springify()}
                    exiting={FadeOutDown}
                    pointerEvents="none"
                >
                    <View
                        className="flex-row items-center gap-2 rounded-full"
                        style={{
                            backgroundColor: colors.surface,
                            borderColor: withAlpha(colors.foreground, 0.12),
                            borderWidth: 1,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                        }}
                    >
                        <SymbolView
                            name="checkmark.circle.fill"
                            size={15}
                            tintColor={colors.income}
                            type="monochrome"
                        />
                        <Text className="font-sans-semibold text-caption text-income">
                            {t("categories.toast.added")}
                        </Text>
                    </View>
                </Animated.View>
            ) : null}

            <IdentityFlyUpLayer
                color={tint}
                containerHeight={containerHeight}
                emoji={draft.emoji}
                icon={draft.icon}
                income={income}
                onDismiss={router.back}
                photoUri={null}
                restTop={heroRestTop}
                variant="category"
            />
        </View>
    );
}
